import moment from 'momentz';
import fs from 'fs-extra';

import * as gmodels from '@aventura-modules/models';
import * as gcontrollers from '@aventura-modules/controllers';
import * as dbHandler from '@aventura-tests/db';


beforeAll(async () => {
    await dbHandler.connect();
});

afterEach(async () => {
    await dbHandler.clearDatabase();
});

afterAll(async () => {
    await dbHandler.closeDatabase();
});

describe("Head::Controller", ()=>{

    test.todo("encodeData");

    test.todo("doGet");

});