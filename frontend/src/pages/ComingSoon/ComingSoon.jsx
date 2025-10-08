import React from 'react';
import { Box, Typography, Container, Card, CardContent } from '@mui/material';
import { styled } from '@mui/material/styles';

const ComingSoonContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
}));

const StyledCard = styled(Card)(({ theme }) => ({
  maxWidth: 600,
  textAlign: 'center',
  padding: theme.spacing(4),
  borderRadius: 20,
  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
}));

const Logo = styled('div')(({ theme }) => ({
  width: 120,
  height: 120,
  margin: '0 auto 24px',
  background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '48px',
  fontWeight: 'bold',
  color: 'white',
  textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
}));

const ComingSoon = () => {
  return (
    <ComingSoonContainer>
      <StyledCard>
        <CardContent>
          <Logo>
            WO
          </Logo>
          
          <Typography 
            variant="h2" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 700,
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2
            }}
          >
            Work Orders
          </Typography>
          
          <Typography 
            variant="h4" 
            component="h2" 
            color="primary" 
            gutterBottom
            sx={{ fontWeight: 500, mb: 3 }}
          >
            Coming Soon
          </Typography>
          
          <Typography 
            variant="h6" 
            color="text.secondary" 
            paragraph
            sx={{ mb: 2 }}
          >
            🚧 Estamos trabajando en algo increíble
          </Typography>
          
          <Typography 
            variant="body1" 
            color="text.secondary" 
            paragraph
          >
            Nuestro sistema de gestión de órdenes de trabajo estará disponible pronto.
            <br />
            ¡Gracias por tu paciencia!
          </Typography>
          
          <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              💡 <strong>Mientras tanto:</strong> Puedes contactarnos para más información
            </Typography>
          </Box>
        </CardContent>
      </StyledCard>
    </ComingSoonContainer>
  );
};

export default ComingSoon;