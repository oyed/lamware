import type { PromiseType } from 'utility-types';
import type { Handler } from 'aws-lambda';
import { merge } from 'merge-anything';
import { register, runMiddleware, init, wrap, clear } from '@/middleware';
import type { BeforeMiddlewarePayload } from '@/middleware';
import type { Instance, Options } from './types';

export const lamware = <H extends Handler = Handler>(options?: Options) => {
    options = options ?? {};

    const instance: Instance<H> = {
        use: middleware => {
            register<H>(middleware);
            return instance;
        },
        execute: handler => {
            return {
                clear,
                handler: async (event, context, callback) => {
                    let response: PromiseType<Exclude<ReturnType<H>, void>>|Error;
                    let payload: BeforeMiddlewarePayload<H> = { event, context };

                    try {
                        await init();

                        payload = await runMiddleware('before', payload);

                        if (payload.response === undefined) {
                            response = await wrap(handler)(payload.event, payload.context, callback);
                        } else {
                            response = payload.response;
                        }
                    } catch (e) {
                        response = e as Error;
                    }

                    const mixed = await runMiddleware('after', { response });
                    response = merge<any, any>(response, mixed.response);

                    if (response instanceof Error) {
                        throw response;
                    }

                    return response;
                },
            };
        },
    };

    return instance;
};

export * from './types';
