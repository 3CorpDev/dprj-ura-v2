<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../vendor/autoload.php';

// Carrega FreePBX e AGI
if (!@include_once(getenv('FREEPBX_CONF') ?: '/etc/freepbx.conf')) {
    include_once('/etc/asterisk/freepbx.conf');
}

$freepbx = \FreePBX::Create();
$agidir = $freepbx->Config()->get('ASTAGIDIR');
require_once $agidir . "/phpagi.php";
require_once __DIR__ . '/model.php';

class IVRFramework {
    private $agi;
    private $db;
    private $mongoClient;
    private $model;
    
    public function __construct() {
        // Inicializa AGI
        $this->agi = new AGI();
        $this->connectMongoDB();
        $this->model = new URAModel($this->db->records);
    }
    
    public function getAGI() {
        return $this->agi;
    }
    
    private function connectMongoDB() {
        try {
            $this->mongoClient = new MongoDB\Client(MONGODB_URI);
            
            // Verifica se o banco de dados existe, se não existir cria
            $databaseExists = false;
            foreach ($this->mongoClient->listDatabases() as $database) {
                if ($database->getName() === MONGODB_DATABASE) {
                    $databaseExists = true;
                    break;
                }
            }
            
            if (!$databaseExists) {
                // Cria o banco criando uma coleção inicial
                $this->mongoClient->selectDatabase(MONGODB_DATABASE)->createCollection('records');
            }
            
            $this->db = $this->mongoClient->{MONGODB_DATABASE};
        } catch (MongoDB\Driver\Exception\Exception $e) {
            $this->logError("MongoDB connection error: " . $e->getMessage());
        }
    }
        
    // Métodos para manipulação de dados no MongoDB usando o modelo
    public function insertCallRecord($data) {
        try {
            $this->verbose("Inserindo registro: " . print_r($data, true));
            return $this->model->insertCallRecord($data);
        } catch (Exception $e) {
            $this->verbose("Erro ao inserir registro: " . $e->getMessage());
            return false;
        }
    }

    public function findCallById($uniqueid) {
        try {
            return $this->model->findCallById($uniqueid);
        } catch (Exception $e) {
            $this->verbose("Erro ao buscar registro: " . $e->getMessage());
            return false;
        }
    }

    public function updateCallRecord($uniqueid, $data) {
        try {
            return $this->model->updateCallRecord($uniqueid, $data);
        } catch (Exception $e) {
            $this->verbose("Erro ao atualizar registro: " . $e->getMessage());
            return false;
        }
    }
        
    // Métodos para manipulação de chamadas
    public function answer() {
        $this->agi->answer();
    }

    public function hangup() {
        $this->agi->hangup();
    }

    public function transfer($extension) {
        $this->agi->exec('Dial', "SIP/$extension");
    }

    public function verbose($message) {
        if (!LOG_ENABLED) return;
        
        if (!is_dir(LOG_PATH)) {
            mkdir(LOG_PATH, 0755, true);
        }
        
        error_log(
            date('[Y-m-d H:i:s] ') . $message . PHP_EOL, 
            3, 
            LOG_PATH . 'ivr_errors.log'
        );
        
        // Adiciona log verbose para o Asterisk
        $this->agi->verbose($message, 1);
    }

    public function dial($extension) {
        $this->agi->exec('Dial', $extension);
    }

    public function playSound($sound) {
        $this->agi->exec('Playback', $sound);
    }

    public function sayDigits($digits) {
        $this->agi->exec('SayDigits', $digits);
    }

    public function updateCallStatus($uniqueid, $active) {
        try {
            $result = $this->updateCallRecord($uniqueid, ['active' => $active]);
            
            $this->verbose("Status da ligação atualizado: " . ($active ? "ativa" : "inativa"));
            return $result;
        } catch (Exception $e) {
            $this->verbose("Erro ao atualizar status da ligação: " . $e->getMessage());
            return false;
        }
    }

    public function monitorCallStatus($uniqueid) {
        // Marca a ligação como ativa no início
        $this->updateCallStatus($uniqueid, true);
        
        // Registra um handler para quando a ligação for desconectada
        $this->agi->set_variable('CHANNEL(hangup_handler_push)', 'hangup,1');
        
        // Adiciona uma variável de canal para armazenar o status
        $this->setVariable('CALL_ACTIVE', '1');
        
        // Monitora o status do canal
        while (true) {
            // Verifica se o canal ainda existe
            $channel_status = $this->agi->get_variable('CHANNEL(state)')['data'];
            
            if ($channel_status === 'DOWN' || $channel_status === null) {
                $this->updateCallStatus($uniqueid, false);
                $this->setVariable('CALL_ACTIVE', '0');
                break;
            }
            
            // Aguarda 1 segundo antes da próxima verificação
            usleep(1000000);
        }
    }

    // Métodos para manipulação de variáveis
    public function setVariable($variable, $value) {
        $this->agi->set_variable($variable, $value);
    }
    
    public function getVariable($variable) {
        return $this->agi->get_variable($variable)['data'];
    }

    // Métodos para manipulação de dígitos
    public function getDigits($prompt = 'beep', $timeout = null, $maxdigits = 1) {
        $timeout = $timeout ?? TEMPO_TIMEOUT * 1000; // Converte para milissegundos
        $data_digits = $this->agi->get_data($prompt, $timeout, $maxdigits);
        return $data_digits['result'];
    }

    public function verboseMessage($message) {
        $this->agi->verbose($message, 1);
    }
        
    public function generateProtocol() {
    	// Gera a data e hora no formato YYYYMMDDHHMMSS
    	$timestamp = date('ymdHis');
    
    	// Gera 4 números aleatórios
    	$random = str_pad(rand(0, 99), 2, '0', STR_PAD_LEFT);

    	// Combina timestamp + números aleatórios
    	$protocol = $timestamp . $random;

    	$this->verbose("Protocolo gerado: " . $protocol);
    	return $protocol;
    }

}
