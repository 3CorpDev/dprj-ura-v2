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
    
    public function executeIVR() {
        $this->answer();

        $uniqueid = $this->getVariable('UNIQUEID');
        $this->saveCallRecord($uniqueid, $this->protocol);

        $this->playSound('dprj/crc-plantao-fds-principal');
        $this->playSound('dprj/crc-plantao-fds-principal1.1');

        $this->dial('PJSIP/551002@T16_TDPRJ', 300, 'HhTtrb');
        
        $this->hangup();
    }
}

// Inicialização
$ivr = new CallCenter();
$ivr->executeIVR();

?>