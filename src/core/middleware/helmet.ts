import helmet from 'helmet';
import lodash from 'lodash';

import { Aventura, AventuraConfig } from '@aventura-core';

import { MiddlewareGenerator } from '.';

const getHelmetMiddleware: MiddlewareGenerator = (aventura, app, config) => {
    if (!config.helmet) {
        throw new Error('Configured Improperly: config.helmet is not set');
    }
    const midd = helmet(lodash.merge({

    }, config.helmet));
    return midd;
}


export default getHelmetMiddleware;