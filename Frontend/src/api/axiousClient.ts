
// // src/api/axiosClient.ts
// import axios from "axios";

// const axiosClient = axios.create({
//   baseURL: "http://localhost:8000/", // Your backend FastAPI/Django base URL
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// // Optional: Add interceptors (e.g., for auth tokens or logging)
// axiosClient.interceptors.request.use(
//   (config) => {

//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// axiosClient.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     console.error("API Error:", error);
//     return Promise.reject(error);
//   }
// );

// export default axiosClient;

//--------------------------------------------------------------------------------------------------------------------------------------------------------------------------


// src/api/axiosClient.ts
import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:8000/", // Your backend FastAPI/Django base URL
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: Add interceptors (e.g., for auth tokens or logging)
axiosClient.interceptors.request.use(
  (config) => {

    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);

export default axiosClient;
