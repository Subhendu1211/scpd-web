import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SCPD API",
      version: "1.0.0",
      description: "REST API documentation for public and admin endpoints."
    },
    servers: [
      { url: "http://localhost:4000/api", description: "Public API" },
      { url: "http://localhost:4000/api/admin", description: "Admin API" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    }
  },
  // Scan route files for @swagger JSDoc blocks
  apis: ["./src/routes/*.js"]
};

export const swaggerSpec = swaggerJsdoc(options);
