// Add these endpoints to your frontend API_ENDPOINTS
export const API_ENDPOINTS = {
    // ... existing endpoints
    MEDICAL_ESTABLISHMENTS: "/medical-establishments",
    // User endpoints
    CREATE_OR_LOGIN_USER: "/users/create-or-login",
    COMPLETE_PROFILE: "/users/complete-profile",
    CHECK_USER_EXISTS: "/users/exists", // append /:userId
    GET_USER_PROFILE: "/users", // append /:userId
};
