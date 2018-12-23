import axios from "axios";

import { api_endpoint } from "./Constants";

const beApi = axios.create({
    baseURL: `${api_endpoint}`
});

/**
 * Response returns a paylod with the following...
 * data: <payload>, status: 200, statusText: "OK", config: Object
 * @param api
 * @param jwt
 */
export async function softwareGet(api, jwt) {
    beApi.defaults.headers.common["Authorization"] = jwt;
    return await beApi
        .get(api)
        .then(resp => {
            return resp;
        })
        .catch(err => {
            console.log(
                `Software.com: error fetching data for ${api}, message: ${
                    err.message
                }`
            );
            return err;
        });
}

export async function softwarePost(api, payload, jwt) {
    // POST the kpm to the PluginManager
    beApi.defaults.headers.common["Authorization"] = jwt;
    return beApi
        .post(api, payload)
        .then(resp => {
            return resp;
        })
        .catch(err => {
            console.log(
                `Software.com: error posting data for ${api}, message: ${
                    err.message
                }`
            );
            return err;
        });
}

export function isResponseOk(resp) {
    if (
        (!resp.response && resp.errno) ||
        (resp.response &&
            resp.response.status &&
            resp.response.status >= 400) ||
        (resp.status && resp.status >= 400) ||
        (resp.code &&
            (resp.code === "ECONNREFUSED" || resp.code === "ENOTFOUND"))
    ) {
        return false;
    }
    return true;
}
