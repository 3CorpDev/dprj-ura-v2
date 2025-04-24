#!/usr/bin/php -q
<?php

require_once __DIR__ . '/framework.php';

class PlaybackHandler extends IVRFramework {
    public function __construct() {
        parent::__construct();
    }

    public function executePlayback() {
        // Obtém o uniqueid da chamada
        $uniqueid = $this->getVariable('UNIQUEID');
        $this->verbose("Buscando registro para uniqueid: " . $uniqueid);
        
        // Busca o registro no MongoDB
        $record = $this->findCallById($uniqueid);
        
        if (!$record) {
            $this->verbose("Nenhum registro encontrado para o uniqueid: " . $uniqueid);
            $this->hangup();
            return;
        }
        
        // Verifica se existe ivr_id no registro
        if (!isset($record['ivr_id'])) {
            $this->verbose("IVR ID não encontrado para o uniqueid: " . $uniqueid);
            $this->hangup();
            return;
        }
        
        $ivr_id = $record['ivr_id'];
        $this->verbose("Reproduzindo áudio para IVR ID: " . $ivr_id);
        
        // Reproduz o áudio correspondente ao ivr_id
        $this->answer();
        $this->playSound('dprj/00001/' . $ivr_id);
        $this->hangup();
    }
}

// Inicialização
$playback = new PlaybackHandler();
$playback->executePlayback();

?>