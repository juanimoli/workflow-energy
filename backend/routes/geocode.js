const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * Geocodificación Inversa
 * Convierte coordenadas (lat, lon) en dirección legible
 * 
 * Usa OpenStreetMap Nominatim API (gratis, sin API key)
 */
router.get('/reverse', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ 
        message: 'Faltan parámetros: lat y lon son requeridos' 
      });
    }

    // Validar coordenadas
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({ 
        message: 'Latitud inválida (debe estar entre -90 y 90)' 
      });
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ 
        message: 'Longitud inválida (debe estar entre -180 y 180)' 
      });
    }

    // Hacer petición a OpenStreetMap Nominatim desde el backend (evita CORS)
    const https = require('https');
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;

    const options = {
      headers: {
        'User-Agent': 'WorkflowEnergy/1.0 (Node.js backend)',
        'Accept': 'application/json'
      }
    };

    https.get(url, options, (apiResponse) => {
      let data = '';

      apiResponse.on('data', (chunk) => {
        data += chunk;
      });

      apiResponse.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          
          if (parsed.display_name) {
            logger.info('Geocoding successful:', {
              lat: latitude,
              lon: longitude,
              address: parsed.display_name
            });

            res.json({
              success: true,
              address: parsed.display_name,
              details: {
                road: parsed.address?.road,
                city: parsed.address?.city || parsed.address?.town || parsed.address?.village,
                state: parsed.address?.state,
                country: parsed.address?.country,
                postcode: parsed.address?.postcode
              }
            });
          } else {
            // Si no hay resultado, devolver coordenadas
            res.json({
              success: false,
              address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              message: 'No se encontró dirección para estas coordenadas'
            });
          }
        } catch (parseError) {
          logger.error('Error parsing geocoding response:', parseError);
          res.json({
            success: false,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            message: 'Error al procesar respuesta de geocodificación'
          });
        }
      });
    }).on('error', (error) => {
      logger.error('Error fetching geocoding data:', error);
      
      // Devolver coordenadas como fallback
      res.json({
        success: false,
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        message: 'No se pudo obtener dirección, usando coordenadas'
      });
    });

  } catch (error) {
    logger.error('Geocoding error:', error);
    res.status(500).json({ 
      message: 'Error en el servicio de geocodificación',
      address: req.query.lat && req.query.lon ? 
        `${parseFloat(req.query.lat).toFixed(6)}, ${parseFloat(req.query.lon).toFixed(6)}` : 
        null
    });
  }
});

/**
 * Geocodificación Directa (opcional)
 * Convierte dirección en coordenadas
 */
router.get('/forward', async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ 
        message: 'Parámetro address es requerido' 
      });
    }

    const https = require('https');
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=5`;

    const options = {
      headers: {
        'User-Agent': 'WorkflowEnergy/1.0 (Node.js backend)',
        'Accept': 'application/json'
      }
    };

    https.get(url, options, (apiResponse) => {
      let data = '';

      apiResponse.on('data', (chunk) => {
        data += chunk;
      });

      apiResponse.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          
          if (parsed && parsed.length > 0) {
            const results = parsed.map(item => ({
              address: item.display_name,
              latitude: parseFloat(item.lat),
              longitude: parseFloat(item.lon),
              importance: item.importance
            }));

            logger.info('Forward geocoding successful:', {
              address,
              results: results.length
            });

            res.json({
              success: true,
              results
            });
          } else {
            res.json({
              success: false,
              results: [],
              message: 'No se encontraron resultados para esta dirección'
            });
          }
        } catch (parseError) {
          logger.error('Error parsing forward geocoding response:', parseError);
          res.status(500).json({
            success: false,
            message: 'Error al procesar respuesta'
          });
        }
      });
    }).on('error', (error) => {
      logger.error('Error fetching forward geocoding data:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar dirección'
      });
    });

  } catch (error) {
    logger.error('Forward geocoding error:', error);
    res.status(500).json({ 
      message: 'Error en el servicio de geocodificación' 
    });
  }
});

module.exports = router;

