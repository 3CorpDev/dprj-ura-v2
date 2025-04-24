#!/usr/bin/php -q
<?php

require_once __DIR__ . '/framework.php';

class HangupHandler extends IVRFramework {
    public function __construct() {
        parent::__construct();
    }

    public function executeHangup() {
        // Obtém o ID único da chamada
        $uniqueid = $this->getVariable('DPRJ_UNIQUEID');
        $this->verbose("===================== 2- UniqueID DPRJ: " . $uniqueid);
        
        $this->verbose("Atualizando status da chamada para inativa");
        $this->updateCallRecord($uniqueid, [
            'active' => false,
            'hangup_time' => new MongoDB\BSON\UTCDateTime(),
            'hangup_cause' => $this->getVariable('HANGUPCAUSE')
        ]);

        $this->verbose("Hangup handler finalizado para chamada: " . $uniqueid);
    }
}

// Inicialização
$hangup = new HangupHandler();
$hangup->executeHangup();

?>
