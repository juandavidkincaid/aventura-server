import { Request, Response } from 'express';
import { URLSearchParams } from 'url';
import axios from 'axios';

import { AventuraConfig } from '@aventura-core';

const verifyReCaptchaChallenge = async (token: string, config: AventuraConfig, req: Request, res: Response, sendError=true) => {
    const params = new URLSearchParams();
    params.set('secret', config.security.reCaptcha.secretKey);
    params.set('response', token);
    if(req.remoteAddress){
        params.set('remoteip', req.remoteAddress);
    }

    const { data: cresponse } = await axios.post<{
        "success": true | false,
        "challenge_ts": string,  // timestamp of the challenge load (ISO format yyyy-MM-dd'T'HH:mm:ssZZ)
        "hostname": string,         // the hostname of the site where the reCAPTCHA was solved
        "error-codes": (
            'missing-input-secret' |
            'invalid-input-secret' |
            'missing-input-response' |
            'invalid-input-response' |
            'bad-request' |
            'timeout-or-duplicate'
        )[]
    }>('https://www.google.com/recaptcha/api/siteverify', {}, { params });
    if (!cresponse.success) {
        sendError && res.sendError(400, {
            reason: "bad-request",
            type: "captcha",
            payload: null
        });
        return false;
    }

    return true;
}

export {
    verifyReCaptchaChallenge
}