import config from './prod.webpack.config';

config.forEach((cfn)=>{
    cfn.watch = true;
    cfn.watchOptions = {poll: 1000};
});

export default config;