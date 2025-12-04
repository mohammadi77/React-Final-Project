function http(url, config) {
  return new Promise((resolve, reject) => {
    fetch(url, config)
      .then(async (response) => {
        const contentType = response.headers.get("content-type");
        const isJson = contentType && contentType.includes("application/json");

        let data;
        try {
          data = isJson ? await response.json() : await response.text();
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
          return;
        }

        if (!response.ok) {
          let message = `HTTP ${response.status}`;
          switch (response.status) {
            case 401:
              message = "Unauthorized: API key is missing or invalid";
              break;
            case 402:
              message = "Payment Required: API key has reached its limit";
              break;
            case 403:
              message = "Forbidden: You do not have access to this resource";
              break;
            case 404:
              message = "Not Found: Resource does not exist";
              break;
            case 405:
              message = "Method Not Allowed: Invalid HTTP method";
              break;
            default:
              if (isJson && data.status_message) message = data.status_message;
          }

          reject(new Error(message));
        } else {
          resolve(data);
        }
      })
      .catch((err) => {
        reject(new Error("Network or CORS error: " + err.message));
      });
  });
}

//const my_key = "ef5ff2cc";
//const my_key = "e544532d";
//const my_key = "6cd7da52";
//const my_key = "193a4586";
//const BASE_URL = "https://www.omdbapi.com/";
const TMDB_KEY = "30ce632140dfbb580cb33c9b5ac2d579";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";
const TMDB_IMG_Original = "https://image.tmdb.org/t/p/original";
