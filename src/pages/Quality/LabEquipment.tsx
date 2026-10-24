import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, Alert, TextField, MenuItem, Grid, IconButton, Tooltip,
} from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { useQualityExtensionStore } from '@/stores/qualityExtensionStore';
import { LabEquipment, LabEquipmentStatus, LabEquipmentType } from '@/types';

const STATUS_LABEL: Record<LabEquipmentStatus, string> = { in_use: '使用中', calibrating: '校准中', idle: '闲置', scrapped: '已报废' };
const TYPE_LABEL: Record<LabEquipmentType, string> = {
  gauge: '量具', cmm: '三坐标', spectrometer: '光谱仪', hardness: '硬度计', balance: '天平', other: '其他',
};

const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (base: string, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const dayDiff = (target: string) => {
  const dt = new Date(target).getTime();
  const dn = new Date(today()).getTime();
  return Math.round((dt - dn) / 86400000);
};

export default function LabEquipmentPage() {
  const { labEquipments, addLabEquipment, calibrateEquipment } = useQualityExtensionStore();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [equipmentNo, setEquipmentNo] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<LabEquipmentType>('gauge');
  const [cycle, setCycle] = useState(180);
  const [last, setLast] = useState(today());

  // 校准预警：查找已过期或即将过期的设备
  const overdueEquipments = useMemo(
    () => labEquipments.filter((e) => dayDiff(e.nextCalibrationDate) < 0),
    [labEquipments]
  );

  const upcomingEquipments = useMemo(
    () => labEquipments.filter((e) => {
      const d = dayDiff(e.nextCalibrationDate);
      return d >= 0 && d <= 30;
    }),
    [labEquipments]
  );

  const submit = () => {
    if (!equipmentNo || !name) return;
    const rec: LabEquipment = {
      id: uid('lab'), equipmentNo, name, type, calibrationCycleDays: cycle, lastCalibrationDate: last,
      nextCalibrationDate: addDays(last, cycle), status: 'in_use',
      createdAt: today(), updatedAt: today(), createdBy: '当前用户', updatedBy: '当前用户',
    };
    addLabEquipment(rec);
    setAdding(false); setEquipmentNo(''); setName(''); setType('gauge'); setCycle(180); setLast(today());
  };

  return (
    <Box sx={{ p: 2 }} data-testid="lab-equipment">
      <Typography variant="h5" gutterBottom>实验室 / 检验设备</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        检验与计量设备主数据，按校准周期自动预警下次校准日期；到期设备标红提示。
      </Alert>

      {/* 校准到期预警横幅 */}
      {overdueEquipments.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }} data-testid="lab-overdue-alert">
          <Typography variant="subtitle2" fontWeight={600}>
            校准到期预警：{overdueEquipments.length} 台设备已逾期！
          </Typography>
          <Typography variant="body2">
            {overdueEquipments.map((e) => `${e.name}(${e.equipmentNo})`).join('、')} - 请立即安排校准
          </Typography>
        </Alert>
      )}
      {upcomingEquipments.length > 0 && overdueEquipments.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            即将到期提醒：{upcomingEquipments.length} 台设备将在30天内到期
          </Typography>
          <Typography variant="body2">
            {upcomingEquipments.map((e) => `${e.name}(${e.equipmentNo})`).join('、')}
          </Typography>
        </Alert>
      )}

      <Chip data-testid="lab-count" label={`设备 ${labEquipments.length}`} sx={{ mb: 1 }} />
      <Button variant="contained" sx={{ ml: 1, mb: 1 }} data-testid="lab-add" onClick={() => setAdding(true)}>新增设备</Button>

      {adding && (
        <Paper sx={{ p: 2, mb: 2 }} data-testid="lab-form">
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}><TextField fullWidth label="设备编号" data-testid="lab-no" value={equipmentNo} onChange={(e) => setEquipmentNo(e.target.value)} /></Grid>
            <Grid item xs={6} md={3}><TextField fullWidth label="设备名称" data-testid="lab-name" value={name} onChange={(e) => setName(e.target.value)} /></Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth select label="类型" data-testid="lab-type" value={type} onChange={(e) => setType(e.target.value as LabEquipmentType)}>
                <MenuItem value="gauge">量具</MenuItem><MenuItem value="cmm">三坐标</MenuItem>
                <MenuItem value="spectrometer">光谱仪</MenuItem><MenuItem value="hardness">硬度计</MenuItem>
                <MenuItem value="balance">天平</MenuItem><MenuItem value="other">其他</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}><TextField fullWidth type="number" label="校准周期(天)" data-testid="lab-cycle" value={cycle} onChange={(e) => setCycle(Number(e.target.value))} /></Grid>
            <Grid item xs={6} md={3}><TextField fullWidth type="date" label="上次校准" data-testid="lab-last" value={last} onChange={(e) => setLast(e.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" data-testid="lab-add-confirm" onClick={submit}>确认新增</Button>
            <Button sx={{ ml: 1 }} data-testid="lab-cancel" onClick={() => setAdding(false)}>取消</Button>
          </Box>
        </Paper>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>编号</TableCell><TableCell>名称</TableCell><TableCell>类型</TableCell>
              <TableCell>上次校准</TableCell><TableCell>下次校准</TableCell>
              <TableCell>距下次校准</TableCell><TableCell>状态</TableCell><TableCell>校准预警</TableCell><TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {labEquipments.map((e) => {
              const days = dayDiff(e.nextCalibrationDate);
              const isOverdue = days < 0;
              return (
                <TableRow key={e.id} data-testid="lab-row" sx={{ bgcolor: isOverdue ? '#FEF2F2' : undefined }}>
                  <TableCell>{e.equipmentNo}</TableCell>
                  <TableCell>{e.name}</TableCell>
                  <TableCell>{TYPE_LABEL[e.type]}</TableCell>
                  <TableCell>{e.lastCalibrationDate}</TableCell>
                  <TableCell>{e.nextCalibrationDate}</TableCell>
                  <TableCell data-testid="lab-cal-days">
                    <Chip
                      size="small"
                      label={isOverdue ? `逾期 ${Math.abs(days)}天` : `${days}天后`}
                      sx={{
                        fontWeight: 600,
                        bgcolor: isOverdue ? '#EF4444' : days <= 30 ? '#F59E0B' : '#10B981',
                        color: '#fff',
                      }}
                    />
                  </TableCell>
                  <TableCell><Chip size="small" label={STATUS_LABEL[e.status]} /></TableCell>
                  <TableCell>
                    {isOverdue
                      ? <Chip size="small" data-testid="lab-due" label="将到期/逾期" color="error" />
                      : days <= 30
                        ? <Chip size="small" label="即将到期" color="warning" />
                        : <Chip size="small" label="正常" color="success" />}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="查看详情"><IconButton size="small" aria-label="查看设备详情" data-testid="lab-detail" onClick={() => navigate(`/quality/lab/${e.id}`)}><Visibility fontSize="small" /></IconButton></Tooltip>
                    <Button size="small" data-testid="lab-calibrate" onClick={() => calibrateEquipment(e.id, today())}>校准</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
