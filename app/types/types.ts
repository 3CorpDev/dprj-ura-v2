export interface CallRecord {
    _id: string;
    source_channel: string;
    customer_number: string;
    uniqueid: string;
    datetime: Date;
    active: boolean;
    protocol?: string;
    metadata: {
        cpf: string | null;
        processo: string | null;
        protocolo: string | null;
        option?: string | null;
        suboption?: string | null;
        created_at: Date;
        updated_at: Date;
    };
    hangup_cause?: string;
    hangup_time?: Date;
} 