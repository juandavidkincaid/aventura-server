import { CookieOptions } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Helmet from 'helmet';

declare global {
    namespace Express {
        interface Response {
            nonces?: Array<string>,
        }
    }
}

interface AventuraConfig {
    dev?: boolean;
    devOptions?: {

    },
    server: {
        port: number;
        hostname: string;
        domain: string;
    };
    security: {
        secretKey: string;
        mongoDbUrl: string;
        ssl?: {
            privateKey: string;
            certificate: string;
            ca: string;
        },
        smtp?: {
            port: number;
            server: string;
            tls: boolean;
            user: string;
            pass: string;
        },
        reCaptcha: {
            siteKey: string,
            secretKey: string
        }
    },
    db: {
        gridfs: {
            bucketname: string
        }
    },
    csrf: {
        headerName: string;
        trustedOrigins: string[],
        tokenAge: number, // 3 days
        secretKey?: string,
        cookieName: string,
        cookieOpts: CookieOptions
    },
    helmet: Parameters<typeof Helmet>["0"],
}

const getConfiguration = async () => {
    const config: AventuraConfig = {
        dev: false,
        server: {
            port: 8080,
            hostname: '0.0.0.0',
            domain: 'aventura.com'
        },
        security: {
            secretKey: 'the-sacred-secret-key',
            mongoDbUrl: '',
            reCaptcha: {
                siteKey: '',
                secretKey: ''
            },
        },
        db: {
            gridfs: {
                bucketname: 'media'
            }
        },
        csrf: {
            headerName: 'X-MRP-RFATK',
            trustedOrigins: [],
            tokenAge: 3 * 24 * 60 * 60 * 1000, // 3 days
            cookieName: 'mrp-rfsi',
            cookieOpts: {
                maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
                httpOnly: true,
                path: '/',
                sameSite: 'lax',
                secure: true
            }
        },
        helmet: {
            contentSecurityPolicy: {
                directives: {
                    'default-src': ["'none'"],
                    'connect-src': ["'self'"],
                    'img-src': ["'self'", "blob:"],
                    'script-src': [
                        "'self'", 
                        process.env.NODE_ENV === 'production' && ((req, res: any) => {
                            if (res.nonces === undefined) {
                                res.nonces = [];
                            }
                            const nonce = Buffer.from(`${uuidv4()}-${uuidv4()}`).toString('base64');
                            res.nonces.push(nonce);
                            return `'nonce-${nonce}'`;
                        }), 
                        'https://recaptcha.net',
                        'https://www.gstatic.com/recaptcha/',
                        process.env.NODE_ENV === 'development' && "'unsafe-inline'",
                        process.env.NODE_ENV === 'development' && "'unsafe-eval'",
                    ].filter(Boolean) as any[],
                    'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
                    'font-src': ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],

                    'base-uri': ["'self'"],

                    'frame-src': ['https://recaptcha.net'],
                    'frame-ancestors': ["'none'"],
                    'navigate-to': ["'none'"],
                    'report-uri': ["/api/v1/security/cspreporting/"]
                }
            },
            referrerPolicy: {
                policy: 'strict-origin-when-cross-origin'
            }
        }
    };

    return config;
}


export {
    AventuraConfig,
    getConfiguration
};