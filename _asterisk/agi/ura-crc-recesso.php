#!/usr/bin/php -q
<?php

require_once __DIR__ . '/framework.php';

// Estende a classe IVRFramework ao invés de criar uma nova
class CallCenter extends IVRFramework {
    public function __construct() {
        // Chama apenas o construtor da classe pai que já faz a conexão com MongoDB
        parent::__construct();
    }

    public function saveCallRecord($option) {
        $channel_id = $this->getVariable('CHANNEL(uniqueid)');
        $customer_number = $this->getVariable('CALLERID(num)');
        
        $document = [
            'channel_id' => $channel_id,
            'customer_number' => $customer_number,
            'datetime' => new MongoDB\BSON\UTCDateTime(),
            'selected_option' => $option,
            'within_hours' => $this->checkServiceHours()
        ];
        
        $this->insertCallRecord($document);
    }
    
    public function executeIVR() {
        $this->answer();

        $option = $this->getDigits('crc-recesso-principal', 5000, 1);
        
        switch($option) {
            case '1':
                $this->saveCallRecord(1);
                $this->playAudio('crc-recesso-option-1');
                
                if ($this->checkServiceHours()) {
                    $channel_id = $this->getVariable('CHANNEL(uniqueid)');
                    $this->setVariable('CHANNEL_ID', $channel_id);
                    $this->dial('SIP/outbound-trunk');
                } else {
                    $this->playAudio('outside-service-hours');
                }
                break;
                
            case '2':
                $this->saveCallRecord(2);
                $this->playAudio('crc-recesso-option-2');
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