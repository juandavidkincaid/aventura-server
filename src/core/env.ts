import moment from 'momentz';
import { Decimal } from 'decimal.js';
import toformat from 'toformat';


const configureEnv = () => {
    toformat(Decimal);

    Decimal.format = {
        decimalSeparator: ',',
        groupSeparator: '.',
        groupSize: 3,
        secondaryGroupSize: 0,
        fractionGroupSeparator: '',
        fractionGroupSize: 0
    };

    moment.tz.setDefault('America/Bogota');
}

export {
    configureEnv
}