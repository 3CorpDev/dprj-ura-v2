<?php

class URAModel {
    private $collection;
    
    public function __construct($collection) {
        $this->collection = $collection;
    }
    
    public function createCallRecord($data) {
        // Campos obrigatórios
        if (!isset($data['source_channel']) || !isset($data['customer_number']) || !isset($data['uniqueid'])) {
            throw new InvalidArgumentException('source_channel, customer_number e uniqueid são campos obrigatórios');
        }

        // ATENÇÃO: Qualquer alteração neste modelo deve ser replicada na API
        // para manter a consistência entre os sistemas.
        // Alterações aqui impactam diretamente na estrutura de dados e
        // podem quebrar a integração com outros serviços.
        
        // Estrutura base do documento
        $document = [
            'source_channel' => $data['source_channel'],
            'customer_number' => $data['customer_number'],
            'uniqueid' => $data['uniqueid'],
            'datetime' => new MongoDB\BSON\UTCDateTime(),
            'active' => true, // se true a ligação está ativa e se false a ligação está encerrada
            'protocol' => $data['protocol'],
            'metadata' => [
                'cpf' => $data['cpf'],
                'processo' => $data['processo'],
                'protocolo' => $data['protocolo'],
                'created_at' => new MongoDB\BSON\UTCDateTime(),
                'updated_at' => new MongoDB\BSON\UTCDateTime()
            ]
        ];

        // Campos opcionais
        if (isset($data['ivr_id'])) {
            $document['ivr_id'] = $data['ivr_id'];
        }

        // Adiciona campos extras ao metadata se existirem
        if (isset($data['metadata']) && is_array($data['metadata'])) {
            $document['metadata'] = array_merge($document['metadata'], $data['metadata']);
        }

        return $document;
    }

    public function insertCallRecord($data) {
        $document = $this->createCallRecord($data);
        return $this->collection->insertOne($document);
    }

    public function findCallById($uniqueid) {
        return $this->collection->findOne(['uniqueid' => $uniqueid]);
    }

    public function updateCallRecord($uniqueid, $data) {
        // Verifica se uniqueid é uma string válida
        if (!is_string($uniqueid)) {
            throw new InvalidArgumentException('uniqueid deve ser uma string válida');
        }

        // Verifica se $data é um array
        if (!is_array($data)) {
            throw new InvalidArgumentException('data deve ser um array');
        }

        $updateData = ['metadata.updated_at' => new MongoDB\BSON\UTCDateTime()];
        
        if (isset($data['metadata'])) {
            foreach ($data['metadata'] as $key => $value) {
                $updateData['metadata.' . $key] = $value;
            }
            unset($data['metadata']);
        }

        $updateData = array_merge($updateData, $data);

        return $this->collection->updateOne(
            ['uniqueid' => $uniqueid],
            ['$set' => $updateData]
        );
    }
}
?>