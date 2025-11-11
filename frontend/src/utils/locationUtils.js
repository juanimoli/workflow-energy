/**
 * Location utilities for formatting and displaying location data
 */

/**
 * Formats a location string for display
 * @param {string} location - Raw location string (could be address or coordinates)
 * @returns {object} - Formatted location object with display text and type
 */
export const formatLocationForDisplay = (location) => {
  if (!location) {
    return {
      displayText: 'No especificada',
      type: 'none',
      isCoordinates: false
    }
  }

  // Check if it's coordinates (starts with "Coordenadas:" or matches lat,lon pattern)
  const coordsPattern = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/
  const coordsWithPrefixPattern = /^Coordenadas:\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/
  
  if (location.startsWith('Coordenadas:') || coordsPattern.test(location.trim())) {
    return {
      displayText: location,
      type: 'coordinates',
      isCoordinates: true,
      tooltip: 'Ubicación basada en coordenadas GPS'
    }
  }

  // If it's a full address, format it nicely
  return {
    displayText: location,
    type: 'address',
    isCoordinates: false,
    tooltip: 'Dirección específica'
  }
}

/**
 * Gets current location with reverse geocoding
 * @param {string} apiUrl - Base API URL
 * @returns {Promise<object>} - Location result object
 */
export const getCurrentLocationWithAddress = async (apiUrl = 'http://localhost:5000') => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Tu navegador no soporta geolocalización'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        try {
          console.log('Attempting geocoding for coordinates:', { latitude, longitude })
          
          const response = await fetch(
            `${apiUrl}/api/geocode/reverse?lat=${latitude}&lon=${longitude}`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            }
          )
          
          console.log('Geocoding response status:', response.status)
          
          if (response.ok) {
            const data = await response.json()
            console.log('Geocoding response data:', data)
            
            if (data.success && data.address) {
              resolve({
                success: true,
                location: data.address,
                coordinates: { latitude, longitude },
                type: 'address',
                originalAddress: data.originalAddress,
                details: data.details
              })
            } else {
              // Fallback to coordinates with more context
              const coordsText = `Coordenadas: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
              console.log('Geocoding failed, using coordinates:', coordsText)
              resolve({
                success: true,
                location: coordsText,
                coordinates: { latitude, longitude },
                type: 'coordinates',
                message: data.message || 'No se encontró dirección'
              })
            }
          } else {
            console.error('Geocoding HTTP error:', response.status, response.statusText)
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
        } catch (error) {
          console.error('Geocoding error:', error)
          // Fallback to coordinates
          const coordsText = `Coordenadas: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          resolve({
            success: true,
            location: coordsText,
            coordinates: { latitude, longitude },
            type: 'coordinates',
            error: error.message
          })
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        let errorMessage = 'No se pudo obtener tu ubicación.'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permisos de geolocalización denegados. Verifica la configuración del navegador.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Información de ubicación no disponible.'
            break
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado para obtener la ubicación.'
            break
        }
        
        reject(new Error(errorMessage))
      },
      {
        enableHighAccuracy: true,
        timeout: 20000, // Increased timeout
        maximumAge: 60000 // Cache for 1 minute
      }
    )
  })
}

/**
 * Test the geocoding service with known coordinates
 * @param {string} apiUrl - Base API URL
 * @returns {Promise<object>} - Test result
 */
export const testGeocodingService = async (apiUrl = 'http://localhost:5000') => {
  // Test with Buenos Aires coordinates (Plaza de Mayo)
  const testLat = -34.6083
  const testLon = -58.3712
  
  try {
    const response = await fetch(
      `${apiUrl}/api/geocode/reverse?lat=${testLat}&lon=${testLon}`
    )
    
    if (response.ok) {
      const data = await response.json()
      return {
        success: true,
        working: data.success,
        testCoords: { lat: testLat, lon: testLon },
        result: data
      }
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}`,
        testCoords: { lat: testLat, lon: testLon }
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      testCoords: { lat: testLat, lon: testLon }
    }
  }
}

/**
 * Extracts coordinates from a coordinate string
 * @param {string} location - Location string that might contain coordinates
 * @returns {object|null} - Coordinates object or null if not found
 */
export const extractCoordinatesFromLocation = (location) => {
  if (!location) return null

  // Pattern for "Coordenadas: lat, lon"
  const coordsWithPrefixPattern = /^Coordenadas:\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/
  const match1 = location.match(coordsWithPrefixPattern)
  
  if (match1) {
    return {
      latitude: parseFloat(match1[1]),
      longitude: parseFloat(match1[2])
    }
  }

  // Pattern for simple "lat, lon"
  const simplePattern = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/
  const match2 = location.trim().match(simplePattern)
  
  if (match2) {
    return {
      latitude: parseFloat(match2[1]),
      longitude: parseFloat(match2[2])
    }
  }

  return null
}

/**
 * Generates a Google Maps or OpenStreetMap link for the location
 * @param {string} location - Location string
 * @returns {string|null} - Map URL or null if not possible
 */
export const generateMapLink = (location) => {
  if (!location) return null

  const coordinates = extractCoordinatesFromLocation(location)
  
  if (coordinates) {
    // Use Google Maps for coordinates
    return `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`
  } else {
    // Use Google Maps search for addresses
    const encodedLocation = encodeURIComponent(location)
    return `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`
  }
}