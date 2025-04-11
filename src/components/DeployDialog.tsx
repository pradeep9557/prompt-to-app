import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Divider,
  Paper
} from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import StorageIcon from '@mui/icons-material/Storage';
import FunctionsIcon from '@mui/icons-material/Functions';
import ComputerIcon from '@mui/icons-material/Computer';

interface DeployDialogProps {
  open: boolean;
  onClose: () => void;
  deploymentType: 'cloud' | 'local' | 'container' | 'serverless';
  setDeploymentType: (type: 'cloud' | 'local' | 'container' | 'serverless') => void;
  deploymentLogs: string[];
  appType: 'web' | 'mobile' | 'desktop' | 'api' | 'cli' | 'animation';
}

const DeployDialog: React.FC<DeployDialogProps> = ({
  open,
  onClose,
  deploymentType,
  setDeploymentType,
  deploymentLogs,
  appType
}) => {
  const getDeploymentOptions = () => {
    switch (appType) {
      case 'web':
        return ['cloud', 'container', 'serverless', 'local'];
      case 'api':
        return ['cloud', 'container', 'serverless', 'local'];
      case 'mobile':
        return ['local'];
      case 'desktop':
        return ['local'];
      case 'cli':
        return ['local'];
      default:
        return ['local'];
    }
  };

  const getDeploymentIcon = (type: string) => {
    switch (type) {
      case 'cloud':
        return <CloudIcon />;
      case 'container':
        return <StorageIcon />;
      case 'serverless':
        return <FunctionsIcon />;
      case 'local':
        return <ComputerIcon />;
      default:
        return null;
    }
  };

  const getDeploymentDescription = (type: string) => {
    switch (type) {
      case 'cloud':
        return 'Deploy to a cloud platform (e.g., AWS, GCP, Azure)';
      case 'container':
        return 'Package and deploy as a container (Docker)';
      case 'serverless':
        return 'Deploy as serverless functions (AWS Lambda, Azure Functions)';
      case 'local':
        return 'Run locally for testing and development';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Deployment Options</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Select Deployment Type</FormLabel>
            <RadioGroup
              value={deploymentType}
              onChange={(e) => setDeploymentType(e.target.value as any)}
            >
              {getDeploymentOptions().map((option) => (
                <Paper
                  key={option}
                  sx={{
                    p: 2,
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                  onClick={() => setDeploymentType(option as any)}
                >
                  <Radio
                    value={option}
                    checked={deploymentType === option}
                    icon={getDeploymentIcon(option)}
                    checkedIcon={getDeploymentIcon(option)}
                  />
                  <Box>
                    <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                      {option}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {getDeploymentDescription(option)}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </RadioGroup>
          </FormControl>

          <Divider />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Deployment Logs
            </Typography>
            <Paper
              sx={{
                p: 2,
                maxHeight: 200,
                overflow: 'auto',
                backgroundColor: 'background.default'
              }}
            >
              {deploymentLogs.map((log, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    color: log.includes('✅') ? 'success.main' : 'text.primary'
                  }}
                >
                  {log}
                </Typography>
              ))}
            </Paper>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" color="primary" onClick={onClose}>
          Deploy
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeployDialog; 