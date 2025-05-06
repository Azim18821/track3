import axios from 'axios';
import { 
  API_URL, 
  NUTRITIONIX_APP_ID, 
  NUTRITIONIX_API_KEY,
  GOOGLE_CLOUD_VISION_API_KEY 
} from '../utils/env';

// Create base axios instance with API URL
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Nutritionix API client
export const nutritionixApi = axios.create({
  baseURL: 'https://trackapi.nutritionix.com/v2',
  headers: {
    'x-app-id': NUTRITIONIX_APP_ID,
    'x-app-key': NUTRITIONIX_API_KEY,
    'Content-Type': 'application/json'
  }
});

// Google Cloud Vision API client
export const googleVisionApi = axios.create({
  baseURL: 'https://vision.googleapis.com/v1',
});

// Example function for analyzing images with Google Cloud Vision
export const analyzeImage = async (imageBase64: string) => {
  try {
    const response = await googleVisionApi.post(
      `/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
      {
        requests: [
          {
            image: {
              content: imageBase64.replace(/^data:image\/(png|jpg|jpeg);base64,/, '')
            },
            features: [
              { type: 'TEXT_DETECTION' },
              { type: 'LABEL_DETECTION' }
            ]
          }
        ]
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
};

// Example function to get nutritional information from Nutritionix
export const getNutritionInfo = async (query: string) => {
  try {
    const response = await nutritionixApi.post('/natural/nutrients', {
      query
    });
    return response.data;
  } catch (error) {
    console.error('Error getting nutrition info:', error);
    throw error;
  }
};

export default api;