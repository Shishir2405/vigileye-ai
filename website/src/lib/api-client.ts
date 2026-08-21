// Thin GraphQL client pointed at the NestJS backend's dashboard-api gateway
// (../backend). Falls back to mock data (./mock-data.ts) when
// NEXT_PUBLIC_API_URL is unset, so the dashboard renders standalone.

import { GraphQLClient } from "graphql-request";

const endpoint = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/graphql";

export const gqlClient = new GraphQLClient(endpoint, {
  headers: () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("cs_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

export const USE_MOCKS = !process.env.NEXT_PUBLIC_API_URL;

// Example query shapes the backend's GraphQL schema is expected to expose.
// Keep these in sync with backend/src/**/schema additions.
export const QUERIES = {
  structures: /* GraphQL */ `
    query Structures {
      structures {
        id
        name
        type
        lat
        lng
        riskLevel
        lastInspected
        activeDetections
      }
    }
  `,
  alerts: /* GraphQL */ `
    query Alerts {
      alerts {
        id
        structureId
        structureName
        detectionId
        severity
        message
        createdAt
        acknowledged
      }
    }
  `,
  structureDetail: /* GraphQL */ `
    query StructureDetail($id: ID!) {
      structure(id: $id) {
        id
        name
        type
        riskLevel
        detections {
          id
          crackType
          widthMm
          lengthCm
          severity
          confidence
          location
          capturedAt
          annotatedImageUrl
        }
      }
    }
  `,
};
