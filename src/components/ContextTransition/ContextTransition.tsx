import React, { useEffect, useState } from 'react';
import { Box, Fade, Slide } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useScopeInfo } from '../../utils/breadcrumbUtils';
import { useOrganisations } from '../../hooks/useLocalData';

interface ContextTransitionProps {
  children: React.ReactNode;
  /**
   * Transition duration in milliseconds
   */
  duration?: number;
  /**
   * Whether to animate on context changes
   */
  animateOnContextChange?: boolean;
}

export const ContextTransition: React.FC<ContextTransitionProps> = ({
  children,
  duration = 300,
  animateOnContextChange = true,
}) => {
  const location = useLocation();
  const { data: organisations = [] } = useOrganisations();
  const scopeInfo = useScopeInfo(organisations);
  
  const [isVisible, setIsVisible] = useState(true);
  const [previousContext, setPreviousContext] = useState(scopeInfo.contextType);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (animateOnContextChange && previousContext !== scopeInfo.contextType) {
      // Context changed - trigger transition
      setIsVisible(false);
      
      const timer = setTimeout(() => {
        setPreviousContext(scopeInfo.contextType);
        setKey(prev => prev + 1);
        setIsVisible(true);
      }, duration / 2);

      return () => clearTimeout(timer);
    } else {
      // No context change or animation disabled
      setPreviousContext(scopeInfo.contextType);
      setIsVisible(true);
    }
  }, [scopeInfo.contextType, previousContext, duration, animateOnContextChange]);

  if (!animateOnContextChange) {
    return <>{children}</>;
  }

  return (
    <Fade
      in={isVisible}
      timeout={duration}
      key={key}
    >
      <Box
        sx={{
          transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }}
      >
        {children}
      </Box>
    </Fade>
  );
};

interface SlideTransitionProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  trigger?: any;
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  children,
  direction = 'left',
  duration = 300,
  trigger,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (trigger !== undefined) {
      setIsVisible(false);
      
      const timer = setTimeout(() => {
        setKey(prev => prev + 1);
        setIsVisible(true);
      }, duration / 2);

      return () => clearTimeout(timer);
    }
  }, [trigger, duration]);

  return (
    <Slide
      direction={direction}
      in={isVisible}
      timeout={duration}
      key={key}
    >
      <Box>
        {children}
      </Box>
    </Slide>
  );
};

interface FadeTransitionProps {
  children: React.ReactNode;
  duration?: number;
  trigger?: any;
}

export const FadeTransition: React.FC<FadeTransitionProps> = ({
  children,
  duration = 300,
  trigger,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (trigger !== undefined) {
      setIsVisible(false);
      
      const timer = setTimeout(() => {
        setKey(prev => prev + 1);
        setIsVisible(true);
      }, duration / 2);

      return () => clearTimeout(timer);
    }
  }, [trigger, duration]);

  return (
    <Fade
      in={isVisible}
      timeout={duration}
      key={key}
    >
      <Box>
        {children}
      </Box>
    </Fade>
  );
};
