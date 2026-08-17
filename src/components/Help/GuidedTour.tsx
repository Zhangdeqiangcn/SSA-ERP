import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Box, Stepper, Step, StepLabel, MobileStepper,
  useTheme, useMediaQuery,
} from '@mui/material';
import {
  Checkroom, Dashboard, NoteAdd, KeyboardArrowLeft, KeyboardArrowRight,
} from '@mui/icons-material';

const TOUR_STORAGE_KEY = 'ssa-erp-guided-tour-done';

const STEPS = [
  {
    label: '欢迎使用 SSA ERP',
    description:
      '欢迎！您已成功登录 SSA ERP 系统。本系统覆盖采购、销售、库存、生产、质量、财务等核心业务模块，帮助企业实现数字化管理。',
    icon: <Checkroom sx={{ fontSize: 48, color: 'primary.main' }} />,
  },
  {
    label: '查看仪表盘',
    description:
      '仪表盘是系统的数据中枢。您可以看到关键经营指标、KPI 趋势图、待办事项列表。点击导航栏中的「仪表盘」或使用快捷键「g + d」即可访问。',
    icon: <Dashboard sx={{ fontSize: 48, color: 'primary.main' }} />,
  },
  {
    label: '创建第一笔单据',
    description:
      '现在试试创建您的第一笔单据吧！进入「销售订单」或「采购订单」，点击「新建」按钮填写信息并提交。系统自动计算金额、税额并触发审批流程。',
    icon: <NoteAdd sx={{ fontSize: 48, color: 'primary.main' }} />,
  },
];

const GuidedTour: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const done = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!done) {
      // 首次登录自动弹出
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = useCallback(() => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      handleClose();
    }
  }, [activeStep]);

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  };

  const handleSkip = () => {
    setOpen(false);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  };

  const maxSteps = STEPS.length;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-label="新用户引导"
      maxWidth="sm"
      fullWidth
      data-testid="guide-tour"
    >
      <DialogTitle>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((step) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', pt: 4, pb: 3 }}>
        <Box sx={{ mb: 2 }}>
          {STEPS[activeStep].icon}
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {STEPS[activeStep].label}
        </Typography>
        <Typography variant="body1" sx={{ color: '#475569', lineHeight: 1.7 }}>
          {STEPS[activeStep].description}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Button
          size="small"
          onClick={handleSkip}
          data-testid="guide-skip"
          sx={{ color: '#94A3B8' }}
        >
          跳过引导
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {activeStep > 0 && (
            <Button
              size="small"
              onClick={handleBack}
              data-testid="guide-prev"
              startIcon={<KeyboardArrowLeft />}
            >
              上一步
            </Button>
          )}
          <Button
            variant="contained"
            size="small"
            onClick={handleNext}
            data-testid="guide-next"
            endIcon={activeStep < maxSteps - 1 ? <KeyboardArrowRight /> : undefined}
          >
            {activeStep === maxSteps - 1 ? '开始使用' : '下一步'}
          </Button>
        </Box>

        <Box sx={{ flex: 1 }} />
      </DialogActions>

      {!isMobile && (
        <Box sx={{ px: 2, pb: 1.5, display: 'flex', justifyContent: 'center' }}>
          <MobileStepper
            variant="dots"
            steps={maxSteps}
            position="static"
            activeStep={activeStep}
            nextButton={<Box />}
            backButton={<Box />}
          />
        </Box>
      )}
    </Dialog>
  );
};

export default GuidedTour;
