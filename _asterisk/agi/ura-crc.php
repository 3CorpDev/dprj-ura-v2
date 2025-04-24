#!/usr/bin/php -q
<?php

require_once __DIR__ . '/framework.php';

// Estende a classe IVRFramework ao invés de criar uma nova
class CallCenter extends IVRFramework {
    private $protocol;

    public function __construct() {
        parent::__construct();
        $this->protocol = $this->generateProtocol();
    }

    public function saveCallRecord($uniqueid, $protocol = null, $data = null) {
        $source_channel = $this->getVariable('CHANNEL');
        $customer_number = $this->getVariable('CALLERID(num)');
        
        $document = [
            'source_channel' => $source_channel,
            'customer_number' => $customer_number,
            'uniqueid' => $uniqueid,
            'datetime' => new MongoDB\BSON\UTCDateTime(),
            'protocol' => $protocol,
            'metadata' => $data
        ];
        
        $this->insertCallRecord($document);
    }

    public function updateCallRecord($uniqueid, $data = null) {
        $document = [
            'metadata' => $data
        ];
        parent::updateCallRecord($uniqueid, $document);
    }
    
    public function executeIVR() {
        $this->answer();
        sleep(1);

        $uniqueid = $this->getVariable('UNIQUEID');
        $this->setVariable('DPRJ_UNIQUEID', $uniqueid);
        $this->saveCallRecord($uniqueid, $this->protocol);
        $this->setVariable('CHANNEL(hangup_handler_push)', 'hangup-dprj,h,1');
    
        // Reproduz mensagem principal
        $this->playSound('dprj/crc-principal');

        // Menu com 3 opções
        $option = $this->getDigits('dprj/crc-menu', 5000, 1);

        switch($option) {
            case '1':
                $this->updateCallRecord($uniqueid, ['option' => '1']);
                $this->playSound('dprj/crc-opcao-1');
                $this->hangup();
                break;
                
            case '2':
                $this->updateCallRecord($uniqueid, ['option' => '2']);
                $this->playSound('dprj/crc-opcao-2');
                $this->hangup();
                break;
                
            case '3':
                // Submenu com 3 opções
                $this->updateCallRecord($uniqueid, ['option' => '3']);
                $this->playSound('dprj/crc-opcao-3');
                $this->playSound('dprj/crc-opcao-3-qualatendimento');
                $subOption = $this->getDigits('dprj/crc-opcao-3-submenu', 5000, 1);
                
                switch($subOption) {
                    case '1':
                        $cpf = $this->getDigits('dprj/crc-coleta-cpf', 5000, 11);
                        
                        if (!$cpf) {
                            $cpf = 'Usuário não informou CPF';
                        }
                        
                        $data = [ 'cpf' => $cpf, 'suboption' => '1' ];
                        $this->updateCallRecord($uniqueid, $data);
                        
                        $this->playSound('dprj/crc-informacao-transferencia');
                        $this->playSound('dprj/crc-aviso-transferencia');
                        
                        $this->dial('PJSIP/551000@T16_TDPRJ', 300, 'HhTtrb');
                        break;
                        
                    case '2':
                        $processo = $this->getDigits('dprj/crc-coleta-processo', 5000, 20);
                        
                        if (!$processo) {
                            $processo = 'Usuário não informou Processo';
                        }

                        $data = [ 'processo' => $processo, 'suboption' => '2' ];
                        $this->updateCallRecord($uniqueid, $data);
                        
                        $this->playSound('dprj/crc-aviso-transferencia');
                        $this->dial('PJSIP/551001@T16_TDPRJ', 300, 'HhTtrb');
                        break;
                        
                    case '3':
                        $data = [ 'suboption' => '3' ];
                        $this->updateCallRecord($uniqueid, $data);

                        $ouvir_protocolo = $this->getDigits('dprj/crc-deseja-ouvir-protocolo', 5000, 1);
                        
                        if ($ouvir_protocolo == '1') {
                            $this->sayDigits($this->protocol);
                        }
                        

                        $this->playSound('dprj/crc-aviso-transferencia');
                        $this->dial('PJSIP/551001@T16_TDPRJ', 300, 'HhTtrb');
                        break;
                        
                    default:
                        $this->hangup();
                        break;
                }
                break;
                
            default:
                $this->hangup();
                break;
        }
        
        // $this->hangup();
        exit;
    }
}

// Inicialização
$ivr = new CallCenter();
$ivr->executeIVR();

?>
