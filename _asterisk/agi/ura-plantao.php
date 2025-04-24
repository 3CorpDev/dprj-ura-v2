#!/usr/bin/php -q
<?php

require_once __DIR__ . '/framework.php';

// Estende a classe IVRFramework ao invés de criar uma nova
class CallCenter extends IVRFramework {
    private $protocol;
    private $documentId;

    public function __construct() {
        parent::__construct();
        $this->protocol = $this->generateProtocol();
        $this->documentId = ''; 
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
        
        $documentInsert = $this->insertCallRecord($document);
        $this->documentId = $documentInsert->getInsertedId();
        $this->documentId = (string)$this->documentId;
        $this->verbose("Registro salvo com ID: " . $this->documentId);
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
        $this->playSound('dprj/crc-plantao-principal');
        
        // Menu com 2 opções
        $option = $this->getDigits('dprj/crc-plantao-menu', 5000, 1);
        
        switch($option) {
            case '1':
                $this->updateCallRecord($uniqueid, ['option' => '1']);
                $this->playSound('dprj/crc-plantao-opcao1');
                $this->playSound('dprj/crc-plantao-opcao1.2');
                $this->playSound('dprj/crc-plantao-opcao1.3');
                break;
                
            case '2':
                $this->updateCallRecord($uniqueid, ['option' => '2']);
                $this->playSound('dprj/crc-plantao-opcao2'); 
                break;
                
            default:
                $this->hangup();
                break;
        }
        
        $this->hangup();
    }
}

// Inicialização
$ivr = new CallCenter();
$ivr->executeIVR();

?>