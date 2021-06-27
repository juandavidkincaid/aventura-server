# Aventura Server

Aventura Server is a sample backend implementation of a Web Application, built in Typescript, using ExpressJs, Yup, Webpack, Jest, Axios, Lodash, MomentJs, MongoDb, Mongoose and Nunjucks.


# Docs
+ [Structure](#structure)
    + [Core](#structure-core)
    + [Modules](#structure-modules)
    + [Util](#structure-util)
    + [Resources](#structure-resources)
+ [Usage and Specs](#usage-and-specs)
    + [Run](#run)
        + [From Built Package](#run-package)
        + [From Custom Build](#run-build)
+ [API](#api)
    + [Market/Restaurants](#api-market-restaurants)
        + [Get Restaurants List](#api-market-get-restaurants)
        + [Create Restaurant](#api-market-post-restaurants)
        + [Get Restaurant](#api-market-get-restaurant)
        + [Modify Restaurant](#api-market-patch-restaurant)
        + [Delete Restaurant](#api-market-delete-restaurant)
+ [Restaurant fetching after first load](#restaurant-fetching-after-first-load)
+ [License](#license)

# Structure
The package is divided in four different components **Core**, **Modules**, **Util**, **Resources**

## Core<a id="structure-core"></a>
Contains all the initialization code, as well as middleware, configurations, environment setups, and the main package class `Aventura`

## Modules<a id="structure-modules"></a>
Contains all the different features of the application. In this case the **Head Module** in charge of the main endpoint resolution, and the **Market Module** in charge of the `market/restaurants` API Endpoint and models

## Util<a id="structure-util"></a>
Contains all shared code consumed either by **Core** or by any module in the application, such code includes ReCaptchaValidation functions, Base64 Data Management among others

## Resources<a id="structure-resources"></a>
Contains all application's static resources

# Usage and Specs

## Environment
+ NodeJS 14.16.1
+ Yarn 1.22.10
+ Ubuntu 20.04.2

## Run 

### From Built Package<a id="run-package"></a>
This repository comes with a [builds](builds) folder in which you can find an installable .tar.gz package, then you would install it with your preferred package manager and import it like so 
```typescript
import * from 'aventura-server'; // For ESModules
require('aventura-server'); // For CommonJSModules
```

By default the server would start inmediately at `0.0.0.0:8080`, with some tweaks on the [server.ts](src/server.ts) file it would behave like a package and would start with a custom configuration

### From Custom Build<a id="run-build"></a>
For running a custom build of the package you would need to follow the next steps

+ Clone this and the [Aventura Client](https://github.com/juandavidkincaid/aventura-client) repository in the same directory
+ Run in both repositories root directory the following command `yarn build`
+ Wait until compilation done =]
+ Make sure a symlink named `clientdist` in [Aventura Server](https://github.com/juandavidkincaid/aventura-server) repository's root is pointing to [Aventura Client](https://github.com/juandavidkincaid/aventura-client) repository's root `dist` directory
+ Run in server's repository root `yarn start`

This would start the server at `0.0.0.0:8080`

# API

### MarketRestaurants<a id="api-market-restaurants"></a>

#### Type: Restaurant Request
```typescript
type RestaurantRequest = {
    name: string,
    instagramProfile: string,
    phone: string,
    image: {
        content: Base64String
        mime: string
    }
};
```

#### Type: Restaurant Response
```typescript
type RestaurantResponse = {
    id: string,
    name: string,
    instagramProfile: string,
    phone: string,
    image: {
        url: string,
        mime: string
    },
    createdAt: ISODate,
    updatedAt: ISODate
};
```

#### Get Restaurants List<a id="api-market-get-restaurants"></a>
`GET /api/v1/market/restaurants/`<br/>
+ Returns a JSON encoded body representation of a list filled with restaurant objects
```typescript
type APIResponse = RestaurantResponse[];
```


#### Create Restaurant<a id="api-market-post-restaurants"></a>
`POST /api/v1/market/restaurants/`<br/>
+ Receives a JSON encoded body representation of a restaurant object<br/>
+ Returns a JSON encoded body representation of a restaurant object or a HTTP 400 Status in case of a `validation-error` error
```typescript
type APIRequest = RestaurantRequest;
type APIResponse = RestaurantResponse;
```

#### Get Restaurant<a id="api-market-get-restaurant"></a>
`GET /api/v1/market/restaurants/{id}/`<br/>
+ Requires a restaurant `id` parameter<br/>
+ Returns a JSON encoded body representation of a restaurant object or a HTTP 404 Status in case of a `not-found` error
```typescript
type APIResponse = RestaurantResponse;
```

#### Modify Restaurant<a id="api-market-patch-restaurant"></a>
`PATCH /api/v1/market/restaurants/{id}/`<br/>
+ Requires a restaurant `id` parameter<br/>
+ Receives a JSON encoded body representation of a restaurant partial object<br/>
+ Returns a JSON encoded body representation of a restaurant object, a HTTP 404 Status in case of a `not-found` error or a HTTP 400 Status in case of a `validation-error` error
```typescript
type RestaurantPartial = DeepPartial<RestaurantRequest>;
type APIRequest = RestaurantPartial;
type APIResponse = RestaurantResponse;
```

#### Delete Restaurant<a id="api-market-delete-restaurant"></a>
`DELETE /api/v1/market/restaurants/{id}/` <br/>
+ Requires a restaurant `id` parameter<br/>
+ Returns a HTTP 204 Status in case of success or a HTTP 404 Status in case of a `not-found` error

# Restaurant fetching after first load

+ ES: Para agregar un nuevo `restaurante` o item en el cliente, cuando la aplicación ya ha cargado los items, al menos una vez, sugeriría hacerlo por un sistema de eventos a través de un WebSocket o parecido, en donde el cliente se suscribiría a un evento que fuera disparado cuando un nuevo item fuera agregado, el cliente recibiría la notificación y decidiría si recolectar o no el nuevo item

+ EN: To add a new `restaurant` or item into the client, when the application has fetched at least one time the items, I would suggest to do it by an event system connected to a WebSocket or similar, where the client would subscribe to a particular event that would be triggered whenever a new item is added to the collection, the client would receive a notification and would decide to fetch or not the new item

# License

This software is licensed under the GNU GENERAL PUBLIC LICENSE, you can find more about it <a href="./LICENSE" target="_blank">Here</a>