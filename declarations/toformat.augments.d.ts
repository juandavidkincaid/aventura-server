import {Decimal} from 'decimal.js';

interface toFormat{
    (fmt?: object): string;
    (dp: number, fmt?: object): string;
    (dp: number, rm: number, fmt?: object): string;
}

declare module 'decimal.js'{
    namespace Decimal{
        let format: object;
    }
    
    interface Decimal{
        toFormat: toFormat;
    }
}