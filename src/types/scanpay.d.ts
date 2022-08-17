type client = {
  paylink: { create: typeof createLink };
  subscriber: { create: typeof createSub; charge: typeof charge };
  sync: { parsePing: any; pull: typeof pull };
  generateIdempotencyKey: typeof generateIdempotencyKey;
  IdempotentResponseError: any;
};

declare module "scanpay" {
  function exports(key: any): client;
  export = exports;
}

function createSub(object: any, options?: any);
function charge(scanpayId: number, object: any, options?: any);
function generateIdempotencyKey(): string;
function pull(seq: number, options?: any): Promise<any>;
function createLink(object: any, options: any);
