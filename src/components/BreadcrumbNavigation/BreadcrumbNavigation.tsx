import React from 'react';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path: string;
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
}

export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({ items }) => {
  const navigate = useNavigate();

  const handleClick = (path: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    navigate(path);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            color: 'text.secondary',
          },
        }}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          if (isLast) {
            return (
              <Typography
                key={item.path}
                color="text.primary"
                sx={{ fontWeight: 600 }}
              >
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={item.path}
              color="inherit"
              href={item.path}
              onClick={handleClick(item.path)}
              sx={{
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};
