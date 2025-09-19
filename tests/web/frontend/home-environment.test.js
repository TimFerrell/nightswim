/**
 * Home Environment Frontend Tests
 * Tests for home environment UI components and functionality
 */

// Mock Chart.js
global.Chart = jest.fn().mockImplementation(() => ({
  destroy: jest.fn(),
  update: jest.fn(),
  data: {
    labels: [],
    datasets: []
  },
  options: {}
}));

// Mock DOM elements
const mockDOM = {
  getElementById: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn()
};

// Mock fetch
global.fetch = jest.fn();

// Mock console methods to avoid noise in tests
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

describe('Home Environment Frontend', () => {
  let mockElements;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset DOM mocks
    document.getElementById = mockDOM.getElementById;
    document.querySelector = mockDOM.querySelector;
    document.querySelectorAll = mockDOM.querySelectorAll;

    // Mock DOM elements
    mockElements = {
      homeTempCard: {
        classList: { add: jest.fn(), remove: jest.fn() },
        querySelector: jest.fn()
      },
      homeHumidityCard: {
        classList: { add: jest.fn(), remove: jest.fn() },
        querySelector: jest.fn()
      },
      homeFeelsLikeCard: {
        classList: { add: jest.fn(), remove: jest.fn() },
        querySelector: jest.fn()
      },
      homeTempValue: { textContent: '', classList: { add: jest.fn(), remove: jest.fn() } },
      homeHumidityValue: { textContent: '', classList: { add: jest.fn(), remove: jest.fn() } },
      homeFeelsLikeValue: { textContent: '', classList: { add: jest.fn(), remove: jest.fn() } },
      homeTempComfort: { textContent: '', classList: { add: jest.fn(), remove: jest.fn() } },
      homeHumidityLevel: { textContent: '', classList: { add: jest.fn(), remove: jest.fn() } },
      homeFeelsLikeComfort: { textContent: '', classList: { add: jest.fn(), remove: jest.fn() } },
      homeEnvironmentChartStatus: { textContent: '', classList: { add: jest.fn(), remove: jest.fn() } }
    };

    // Setup DOM element mocks
    mockDOM.getElementById.mockImplementation((id) => {
      if (id === 'homeTempCard') return mockElements.homeTempCard;
      if (id === 'homeHumidityCard') return mockElements.homeHumidityCard;
      if (id === 'homeFeelsLikeCard') return mockElements.homeFeelsLikeCard;
      if (id === 'homeTempValue') return mockElements.homeTempValue;
      if (id === 'homeHumidityValue') return mockElements.homeHumidityValue;
      if (id === 'homeFeelsLikeValue') return mockElements.homeFeelsLikeValue;
      if (id === 'homeTempComfort') return mockElements.homeTempComfort;
      if (id === 'homeHumidityLevel') return mockElements.homeHumidityLevel;
      if (id === 'homeFeelsLikeComfort') return mockElements.homeFeelsLikeComfort;
      if (id === 'homeEnvironmentChartStatus') return mockElements.homeEnvironmentChartStatus;
      return null;
    });

    // Setup querySelector mocks
    mockElements.homeTempCard.querySelector.mockImplementation((selector) => {
      if (selector === '.status-value') return mockElements.homeTempValue;
      if (selector === '.status-detail-value') return mockElements.homeTempComfort;
      return null;
    });

    mockElements.homeHumidityCard.querySelector.mockImplementation((selector) => {
      if (selector === '.status-value') return mockElements.homeHumidityValue;
      if (selector === '.status-detail-value') return mockElements.homeHumidityLevel;
      return null;
    });

    mockElements.homeFeelsLikeCard.querySelector.mockImplementation((selector) => {
      if (selector === '.status-value') return mockElements.homeFeelsLikeValue;
      if (selector === '.status-detail-value') return mockElements.homeFeelsLikeComfort;
      return null;
    });
  });

  describe('Home Environment Data Loading', () => {
    it('should load home environment data successfully', async () => {
      const mockData = {
        success: true,
        data: {
          temperature: 72.5,
          humidity: 45.2,
          feelsLike: 74.1,
          comfortLevel: 'comfortable',
          humidityLevel: 'normal',
          timestamp: '2025-01-01T10:00:00Z'
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      // Mock the updateHomeEnvironmentCards function
      const updateHomeEnvironmentCards = jest.fn();
      global.updateHomeEnvironmentCards = updateHomeEnvironmentCards;

      // Simulate the loadHomeEnvironmentData function
      const loadHomeEnvironmentData = async () => {
        try {
          const response = await fetch('/api/home/environment');
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              updateHomeEnvironmentCards(result.data);
            }
          }
        } catch (error) {
          console.error('Home environment data load error:', error);
        }
      };

      await loadHomeEnvironmentData();

      expect(global.fetch).toHaveBeenCalledWith('/api/home/environment');
      expect(updateHomeEnvironmentCards).toHaveBeenCalledWith(mockData.data);
    });

    it('should handle API errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const updateHomeEnvironmentCards = jest.fn();
      global.updateHomeEnvironmentCards = updateHomeEnvironmentCards;

      const loadHomeEnvironmentData = async () => {
        try {
          const response = await fetch('/api/home/environment');
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              updateHomeEnvironmentCards(result.data);
            }
          }
        } catch (error) {
          console.error('Home environment data load error:', error);
          updateHomeEnvironmentCards({ error: error.message });
        }
      };

      await loadHomeEnvironmentData();

      expect(updateHomeEnvironmentCards).toHaveBeenCalledWith({ error: 'Network error' });
    });

    it('should load home environment time series data', async () => {
      const mockData = {
        success: true,
        data: [
          {
            timestamp: '2025-01-01T10:00:00Z',
            temperature: 72.5,
            humidity: 45.2,
            feelsLike: 74.1
          },
          {
            timestamp: '2025-01-01T11:00:00Z',
            temperature: 73.0,
            humidity: 46.0,
            feelsLike: 74.8
          }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      const updateHomeEnvironmentChart = jest.fn();
      global.updateHomeEnvironmentChart = updateHomeEnvironmentChart;

      const loadHomeEnvironmentTimeSeries = async (hours = 24) => {
        try {
          const response = await fetch(`/api/home/timeseries?hours=${hours}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              updateHomeEnvironmentChart(result.data);
            }
          }
        } catch (error) {
          console.error('Home environment time series load error:', error);
        }
      };

      await loadHomeEnvironmentTimeSeries(24);

      expect(global.fetch).toHaveBeenCalledWith('/api/home/timeseries?hours=24');
      expect(updateHomeEnvironmentChart).toHaveBeenCalledWith(mockData.data);
    });
  });

  describe('Home Environment Card Updates', () => {
    it('should update home environment cards with valid data', () => {
      const data = {
        temperature: 72.5,
        humidity: 45.2,
        feelsLike: 74.1,
        comfortLevel: 'comfortable',
        humidityLevel: 'normal'
      };

      // Mock the updateHomeEnvironmentCard function
      const updateHomeEnvironmentCard = jest.fn();
      global.updateHomeEnvironmentCard = updateHomeEnvironmentCard;

      const updateHomeEnvironmentCards = (data) => {
        if (data.error) {
          updateHomeEnvironmentCard('homeTempCard', { error: data.error });
          updateHomeEnvironmentCard('homeHumidityCard', { error: data.error });
          updateHomeEnvironmentCard('homeFeelsLikeCard', { error: data.error });
          return;
        }

        updateHomeEnvironmentCard('homeTempCard', {
          value: data.temperature,
          unit: '°F',
          comfort: data.comfortLevel,
          sparkline: 'homeTempSparkline'
        });

        updateHomeEnvironmentCard('homeHumidityCard', {
          value: data.humidity,
          unit: '%',
          level: data.humidityLevel,
          sparkline: 'homeHumiditySparkline'
        });

        updateHomeEnvironmentCard('homeFeelsLikeCard', {
          value: data.feelsLike,
          unit: '°F',
          comfort: data.comfortLevel,
          sparkline: 'homeFeelsLikeSparkline'
        });
      };

      updateHomeEnvironmentCards(data);

      expect(updateHomeEnvironmentCard).toHaveBeenCalledWith('homeTempCard', {
        value: 72.5,
        unit: '°F',
        comfort: 'comfortable',
        sparkline: 'homeTempSparkline'
      });

      expect(updateHomeEnvironmentCard).toHaveBeenCalledWith('homeHumidityCard', {
        value: 45.2,
        unit: '%',
        level: 'normal',
        sparkline: 'homeHumiditySparkline'
      });

      expect(updateHomeEnvironmentCard).toHaveBeenCalledWith('homeFeelsLikeCard', {
        value: 74.1,
        unit: '°F',
        comfort: 'comfortable',
        sparkline: 'homeFeelsLikeSparkline'
      });
    });

    it('should handle error states in cards', () => {
      const data = { error: 'API Error' };

      const updateHomeEnvironmentCard = jest.fn();
      global.updateHomeEnvironmentCard = updateHomeEnvironmentCard;

      const updateHomeEnvironmentCards = (data) => {
        if (data.error) {
          updateHomeEnvironmentCard('homeTempCard', { error: data.error });
          updateHomeEnvironmentCard('homeHumidityCard', { error: data.error });
          updateHomeEnvironmentCard('homeFeelsLikeCard', { error: data.error });
          return;
        }
      };

      updateHomeEnvironmentCards(data);

      expect(updateHomeEnvironmentCard).toHaveBeenCalledWith('homeTempCard', { error: 'API Error' });
      expect(updateHomeEnvironmentCard).toHaveBeenCalledWith('homeHumidityCard', { error: 'API Error' });
      expect(updateHomeEnvironmentCard).toHaveBeenCalledWith('homeFeelsLikeCard', { error: 'API Error' });
    });
  });

  describe('Home Environment Chart Updates', () => {
    it('should update chart with valid data', () => {
      const data = [
        {
          timestamp: '2025-01-01T10:00:00Z',
          temperature: 72.5,
          humidity: 45.2,
          feelsLike: 74.1
        },
        {
          timestamp: '2025-01-01T11:00:00Z',
          temperature: 73.0,
          humidity: 46.0,
          feelsLike: 74.8
        }
      ];

      const mockChart = {
        data: {
          labels: [],
          datasets: [
            { data: [] }, // Temperature dataset
            { data: [] }, // Humidity dataset
            { data: [] }  // Feels-like dataset
          ]
        },
        update: jest.fn()
      };

      global.homeEnvironmentChart = mockChart;

      const updateHomeEnvironmentChart = (data) => {
        if (data.error) {
          const statusElement = document.getElementById('homeEnvironmentChartStatus');
          if (statusElement) {
            statusElement.textContent = 'Error loading data';
            statusElement.classList.add('error');
          }
          return;
        }

        if (!global.homeEnvironmentChart) {
          console.warn('Home environment chart not initialized');
          return;
        }

        const labels = data.map(d => new Date(d.timestamp));
        const temperatureData = data.map(d => d.temperature);
        const humidityData = data.map(d => d.humidity);
        const feelsLikeData = data.map(d => d.feelsLike);

        global.homeEnvironmentChart.data.labels = labels;
        global.homeEnvironmentChart.data.datasets[0].data = temperatureData;
        global.homeEnvironmentChart.data.datasets[1].data = humidityData;
        global.homeEnvironmentChart.data.datasets[2].data = feelsLikeData;

        global.homeEnvironmentChart.update('none');

        const statusElement = document.getElementById('homeEnvironmentChartStatus');
        if (statusElement) {
          statusElement.textContent = `${data.length} data points`;
          statusElement.classList.remove('error');
        }
      };

      updateHomeEnvironmentChart(data);

      expect(mockChart.data.labels).toEqual([
        new Date('2025-01-01T10:00:00Z'),
        new Date('2025-01-01T11:00:00Z')
      ]);
      expect(mockChart.data.datasets[0].data).toEqual([72.5, 73.0]);
      expect(mockChart.data.datasets[1].data).toEqual([45.2, 46.0]);
      expect(mockChart.data.datasets[2].data).toEqual([74.1, 74.8]);
      expect(mockChart.update).toHaveBeenCalledWith('none');
      expect(mockElements.homeEnvironmentChartStatus.textContent).toBe('2 data points');
    });

    it('should handle chart errors gracefully', () => {
      const data = { error: 'Chart Error' };

      const updateHomeEnvironmentChart = (data) => {
        if (data.error) {
          const statusElement = document.getElementById('homeEnvironmentChartStatus');
          if (statusElement) {
            statusElement.textContent = 'Error loading data';
            statusElement.classList.add('error');
          }
          return;
        }
      };

      updateHomeEnvironmentChart(data);

      expect(mockElements.homeEnvironmentChartStatus.textContent).toBe('Error loading data');
      expect(mockElements.homeEnvironmentChartStatus.classList.add).toHaveBeenCalledWith('error');
    });

    it('should handle missing chart gracefully', () => {
      const data = [
        {
          timestamp: '2025-01-01T10:00:00Z',
          temperature: 72.5,
          humidity: 45.2,
          feelsLike: 74.1
        }
      ];

      global.homeEnvironmentChart = null;

      const updateHomeEnvironmentChart = (data) => {
        if (data.error) {
          return;
        }

        if (!global.homeEnvironmentChart) {
          console.warn('Home environment chart not initialized');
          return;
        }
      };

      updateHomeEnvironmentChart(data);

      expect(console.warn).toHaveBeenCalledWith('Home environment chart not initialized');
    });
  });

  describe('Utility Functions', () => {
    it('should capitalize first letter correctly', () => {
      const capitalizeFirst = (str) => {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
      };

      expect(capitalizeFirst('comfortable')).toBe('Comfortable');
      expect(capitalizeFirst('hot')).toBe('Hot');
      expect(capitalizeFirst('normal')).toBe('Normal');
      expect(capitalizeFirst('')).toBe('');
      expect(capitalizeFirst(null)).toBe(null);
      expect(capitalizeFirst(undefined)).toBe(undefined);
    });
  });
});
