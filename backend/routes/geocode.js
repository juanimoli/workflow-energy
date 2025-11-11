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
    
    // Add language preference and zoom level for better results
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=es,en&zoom=18`;

    const options = {
      headers: {
        'User-Agent': 'WorkflowEnergy/1.0 (contact@workflowenergy.com)',
        'Accept': 'application/json',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      },
      timeout: 10000 // 10 second timeout
    };

    logger.info('Attempting reverse geocoding:', { lat: latitude, lon: longitude, url });

    const request = https.get(url, options, (apiResponse) => {
      let data = '';

      apiResponse.on('data', (chunk) => {
        data += chunk;
      });

      apiResponse.on('end', () => {
        try {
          logger.info('Nominatim response received:', { statusCode: apiResponse.statusCode, dataLength: data.length });
          
          if (apiResponse.statusCode !== 200) {
            logger.warn('Nominatim returned non-200 status:', apiResponse.statusCode);
            return res.json({
              success: false,
              address: `Coordenadas: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              message: 'Servicio de geocodificación no disponible'
            });
          }

          const parsed = JSON.parse(data);
          
          if (parsed && parsed.display_name) {
            // Create a more readable address format
            let formattedAddress = parsed.display_name;
            
            // Try to create a shorter, more readable format for Argentina
            if (parsed.address) {
              const addr = parsed.address;
              const parts = [];
              
              // Add street info
              if (addr.house_number && addr.road) {
                parts.push(`${addr.road} ${addr.house_number}`);
              } else if (addr.road) {
                parts.push(addr.road);
              }
              
              // Add locality
              const locality = addr.city || addr.town || addr.village || addr.municipality;
              if (locality) {
                parts.push(locality);
              }
              
              // Add state/province
              if (addr.state && addr.state !== locality) {
                parts.push(addr.state);
              }
              
              // Add country if not Argentina (since it's likely an Argentine app)
              if (addr.country && !addr.country.includes('Argentina')) {
                parts.push(addr.country);
              }
              
              if (parts.length > 0) {
                formattedAddress = parts.join(', ');
              }
            }

            logger.info('Geocoding successful:', {
              lat: latitude,
              lon: longitude,
              originalAddress: parsed.display_name,
              formattedAddress: formattedAddress
            });

            res.json({
              success: true,
              address: formattedAddress,
              originalAddress: parsed.display_name,
              details: {
                road: parsed.address?.road,
                house_number: parsed.address?.house_number,
                city: parsed.address?.city || parsed.address?.town || parsed.address?.village,
                municipality: parsed.address?.municipality,
                state: parsed.address?.state,
                country: parsed.address?.country,
                postcode: parsed.address?.postcode
              }
            });
          } else {
            logger.warn('No address found in Nominatim response:', parsed);
            // Si no hay resultado, devolver coordenadas formateadas
            res.json({
              success: false,
              address: `Coordenadas: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              message: 'No se encontró dirección para estas coordenadas'
            });
          }
        } catch (parseError) {
          logger.error('Error parsing geocoding response:', { 
            error: parseError.message, 
            data: data.substring(0, 200) 
          });
          res.json({
            success: false,
            address: `Coordenadas: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            message: 'Error al procesar respuesta de geocodificación'
          });
        }
      });
    });

    request.on('error', (error) => {
      logger.error('Error fetching geocoding data:', error);
      
      // Devolver coordenadas como fallback
      res.json({
        success: false,
        address: `Coordenadas: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        message: 'No se pudo obtener dirección, usando coordenadas'
      });
    });

    request.on('timeout', () => {
      logger.error('Geocoding request timeout');
      request.destroy();
      res.json({
        success: false,
        address: `Coordenadas: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        message: 'Tiempo de espera agotado para obtener dirección'
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

