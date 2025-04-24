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

    public function saveCallRecord($uniqueid, $protocol, $option = null) {
        $source_channel = $this->getVariable('CHANNEL');
        $customer_number = $this->getVariable('CALLERID(num)');
        
        $document = [
            'source_channel' => $source_channel,
            'customer_number' => $customer_number,
            'uniqueid' => $uniqueid,
            'datetime' => new MongoDB\BSON\UTCDateTime(),
            'selected_option' => $option,
            'protocol' => $protocol,
            'metadata' => [
                'cpf' => '22233344455'
            ]
        ];
        
        $this->insertCallRecord($document);
    }
    
    public function executeDial() {
        $this->answer();
        $uniqueid = $this->getVariable('UNIQUEID');
        $this->setVariable('DPRJ_UNIQUEID', $uniqueid);
        $this->saveCallRecord($uniqueid, $this->protocol);
        
        // Configura o monitoramento sem bloquear
        $this->setVariable('CHANNEL(hangup_handler_push)', 'hangup-dprj,h,1');
        $this->updateCallStatus($uniqueid, true);

        $this->dial('PJSIP/556677@T16_TDPRJ', 300, 'HhTtrb');
        
        exit;
    }
}

// Inicialização
$ivr = new CallCenter();
$ivr->executeDial();

?>
