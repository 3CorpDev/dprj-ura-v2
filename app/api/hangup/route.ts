import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';
import AmiClient from 'asterisk-ami-client';

const uri = process.env.MONGODB_URI;

// Lazy proxy for MongoClient: do not construct real MongoClient at module import time.
// The real client will be created only when a property/method is accessed.
let _mongoClient: MongoClient | null = null;
function ensureMongoClient() {
  if (!_mongoClient) {
    if (!uri) throw new Error('MONGODB_URI is not defined');
    _mongoClient = new MongoClient(uri);
  }
  return _mongoClient;
}

const mongoClient = new Proxy({}, {
  get(_target, prop) {
    const real = ensureMongoClient();
    // forward methods/properties, binding functions to the real client
    // @ts-ignore
    const v = real[prop as keyof MongoClient];
    return typeof v === 'function' ? (v as Function).bind(real) : v;
  }
}) as unknown as MongoClient;

// Função para criar uma nova conexão AMI
function createAmiClient() {
  const amiClient = new AmiClient();
  const amiConfig = {
    host: process.env.ASTERISK_HOST || '119.8.85.49',
    port: process.env.ASTERISK_PORT || '5038',
    username: process.env.ASTERISK_USERNAME || 'dprj',
    password: process.env.ASTERISK_PASSWORD || 'bbf6b592564c40eb0c335d205ea5a9dbf43ce498'
  };

  return { amiClient, amiConfig };
}

export async function POST(request: Request) {
  let amiClient: AmiClient | null = null;
  console.log('======= REQUEST =======')
  console.log(`METHOD: ${request.method} -- URL: ${request.url} -- CONTENT TYPE: ${request.headers.get('content-type')}`)
  console.log('======= REQUEST =======')
  try {
    const body = await request.json();

    console.log('======= REQUEST JSON =======')
    console.log(body)
    console.log('======= REQUEST JSON =======')

    const { ivr_id, uniqueid } = body;

    if (!ivr_id || !uniqueid) {
      return NextResponse.json(
        { success: false, message: 'IVR ID e Uniqueid são obrigatórios' },
        { status: 400 }
      );
    }

    if (uniqueid === '1111111111.1' || uniqueid === '1111111111.2' || uniqueid === '1111111111.3' || uniqueid === '1111111111.4') {
      return reponseTest(uniqueid);
    }

    // Cria nova conexão AMI para cada requisição
    const { amiClient: newAmiClient, amiConfig } = createAmiClient();
    amiClient = newAmiClient;

    // Conecta ao AMI
    await amiClient.connect(amiConfig.username, amiConfig.password, {
      host: amiConfig.host,
      port: Number(amiConfig.port)
    })
    console.log('Conectado ao AMI DPRJ');

    // Conecta ao MongoDB
    await mongoClient.connect();
    const database = mongoClient.db('ura_dprj');
    const collection = database.collection('records');

    // Busca os canais ativos
    await amiClient.action({
      Action: 'CoreShowChannels'
    });

    // Aguarda a resposta do evento CoreShowChannelsComplete
    const channels: any[] = [];
    await new Promise((resolve) => {
      const handleEvent = (event: any) => {
        if (event.Event === 'CoreShowChannelsComplete') {
          amiClient?.off('event', handleEvent);
          resolve(true);
        } else if (event.Event === 'CoreShowChannel') {
          channels.push(event);
        }
      };

      amiClient?.on('event', handleEvent);
    });

    const destinationChannel = channels.find(
      (channel) => channel.Linkedid === uniqueid && channel.Uniqueid !== uniqueid
    );

    if (!destinationChannel) {
      return NextResponse.json(
        { success: false, message: 'Canal não encontrado.' },
        { status: 404 }
      );
    }
    // Desliga o canal
    await amiClient.action({
      Action: 'Hangup',
      Channel: destinationChannel.Channel
    });

    const result = await collection.updateOne(
      { uniqueid: uniqueid },
      {
        $set: {
          active: false,
          hangup_cause: 'API_HANGUP',
          hangup_time: new Date(),
          ivr_id: ivr_id,
          'metadata.updated_at': new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Registro não encontrado.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Chamada finalizada com sucesso',
      destinationChannel: destinationChannel
    });

  } catch (error) {
    console.error('Erro ao processar hangup:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  } finally {
    // Garante que as conexões sejam fechadas
    if (amiClient) {
      await amiClient.disconnect();
    }
    await mongoClient.close().catch(console.error);
  }
}

async function reponseTest(uniqueid: string) {
  switch (uniqueid) {
    case '1111111111.1':
      return NextResponse.json({
        success: true,
        message: 'Chamada finalizada com sucesso',
        destinationChannel: {
          Event: "CoreShowChannel",
          ActionID: "--spec_1738289288093",
          Channel: "PJSIP/T16_TDPRJ-00000001",
          ChannelState: "6",
          ChannelStateDesc: "Up",
          CallerIDNum: "556677",
          CallerIDName: "<unknown>",
          ConnectedLineNum: "7007",
          ConnectedLineName: "Suporte 3Corp",
          Language: "en",
          AccountCode: "",
          Context: "from-pstn",
          Exten: "",
          Priority: "1",
          Uniqueid: "1111111111.1",
          Linkedid: "1111111111.1",
          Application: "AppDial",
          ApplicationData: "(Outgoing Line)",
          Duration: "00:00:24",
          BridgeId: "f1381d0f-1e7c-4c0b-a62c-09f27b6440d0"
        }
      }, { status: 200 });
    case '1111111111.2':
      return NextResponse.json(
        { success: false, message: 'Erro interno ao processar a requisição' },
        { status: 500 }
      );
    case '1111111111.3':
      return NextResponse.json(
        { success: false, message: 'Canal não encontrado' },
        { status: 404 }
      );
    case '1111111111.4':
      return NextResponse.json(
        { success: false, message: 'Registro não encontrado' },
        { status: 404 }
      );
  }
}