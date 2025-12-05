import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // اگر فایل CSS دارید

// پیدا کردن ریشه DOM که React روی آن رندر می‌شود
const root = ReactDOM.createRoot(document.getElementById("root"));

// رندر کردن کامپوننت اصلی App
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
