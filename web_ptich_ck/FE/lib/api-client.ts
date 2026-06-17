import axios from 'axios';
import Cookies from 'js-cookie';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const api = {
  dataSources: {
    list: async (workspaceId: string) => {
      const response = await apiClient.get(`/data-sources/workspace/${workspaceId}`);
      return response.data;
    },
    create: async (data: any) => {
      const response = await apiClient.post('/data-sources/', data);
      return response.data;
    },
    testConnection: async (data: any) => {
      const response = await apiClient.post('/data-sources/test-connection', data);
      return response.data;
    },
    update: async (id: string, data: any) => {
      const response = await apiClient.put(`/data-sources/${id}`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await apiClient.delete(`/data-sources/${id}`);
      return response.data;
    },
    getDatabases: async (id: string) => {
      const response = await apiClient.get(`/data-sources/${id}/databases`);
      return response.data;
    },
    getMetadata: async (id: string, database?: string) => {
      const params = database ? { database } : {};
      const response = await apiClient.get(`/data-sources/${id}/metadata`, { params });
      return response.data;
    }
  },
  queries: {
    list: async (workspaceId: string) => {
      const response = await apiClient.get(`/queries/workspace/${workspaceId}`);
      return response.data;
    },
    preview: async (data: any) => {
      const response = await apiClient.post('/queries/preview', data);
      return response.data;
    },
    create: async (data: any) => {
      const response = await apiClient.post('/queries/', data);
      return response.data;
    },
    update: async (id: string, data: any) => {
      const response = await apiClient.put(`/queries/${id}`, data);
      return response.data;
    }
  },
  datasets: {
    list: async (workspaceId: string) => {
      const response = await apiClient.get(`/datasets/workspace/${workspaceId}`);
      return response.data;
    },
    create: async (data: any) => {
      const response = await apiClient.post('/datasets/', data);
      return response.data;
    },
    update: async (id: string, data: any) => {
      const response = await apiClient.put(`/datasets/${id}`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await apiClient.delete(`/datasets/${id}`);
      return response.data;
    },
    preview: async (id: string) => {
      const response = await apiClient.post(`/datasets/${id}/preview`);
      return response.data;
    },
    importExcel: async (data: any) => {
      const response = await apiClient.post('/datasets/import-excel', data);
      return response.data;
    }
  },
  folders: {
    list: async (workspaceId: string) => {
      const response = await apiClient.get(`/datasets/folders/workspace/${workspaceId}`);
      return response.data;
    },
    create: async (data: { name: string; workspace_id: string; parent_id: string | null }) => {
      const response = await apiClient.post('/datasets/folders', data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await apiClient.delete(`/datasets/folders/${id}`);
      return response.data;
    }
  },

  charts: {
    list: async (workspaceId: string) => {
      const response = await apiClient.get(`/charts/workspace/${workspaceId}`);
      return response.data;
    },
    create: async (data: any) => {
      const response = await apiClient.post('/charts/', data);
      return response.data;
    },
    update: async (id: string, data: any) => {
      const response = await apiClient.put(`/charts/${id}`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await apiClient.delete(`/charts/${id}`);
      return response.data;
    },
    aiCodeGen: async (data: {
      prompt: string;
      columns: { name: string; type?: string }[];
      sample_rows: Record<string, any>[];
      current_code?: string;
    }): Promise<{ code: string; is_first_gen: boolean }> => {
      const response = await apiClient.post('/charts/ai-code-gen', data);
      return response.data;
    }
  },
  dashboards: {
    list: async (workspaceId: string) => {
      const response = await apiClient.get(`/dashboards/workspace/${workspaceId}`);
      return response.data;
    },
    create: async (data: any) => {
      const response = await apiClient.post('/dashboards/', data);
      return response.data;
    },
    update: async (id: string, data: any) => {
      const response = await apiClient.put(`/dashboards/${id}`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await apiClient.delete(`/dashboards/${id}`);
      return response.data;
    }
  },
  permissions: {
    // Lấy danh sách tất cả users
    listUsers: async () => {
      const response = await apiClient.get('/permissions/users');
      return response.data;
    },
    // Lấy permissions của 1 chart
    getChartPermissions: async (chartId: string) => {
      const response = await apiClient.get(`/permissions/charts/${chartId}`);
      return response.data;
    },
    // Ghi đè permissions cho 1 chart
    setChartPermissions: async (chartId: string, userIds: number[]) => {
      const response = await apiClient.post(`/permissions/charts/${chartId}`, { user_ids: userIds });
      return response.data;
    },
    // Batch set permissions cho nhiều charts
    batchSetPermissions: async (chartIds: string[], userIds: number[]) => {
      const response = await apiClient.post('/permissions/charts/batch', { chart_ids: chartIds, user_ids: userIds });
      return response.data;
    },
    // Lấy permissions của nhiều charts (dashboard load)
    getDashboardChartPermissions: async (chartIds: string[]) => {
      const response = await apiClient.post('/permissions/dashboard-charts', chartIds);
      return response.data; // { chart_id: [user_ids] }
    },
  }
};
