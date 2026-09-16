import React, { useMemo, useState } from 'react';
import {
  Box, Typography, FormControl, InputLabel, Select, MenuItem, Paper, Table, TableHead,
  TableRow, TableCell, TableBody, Chip, LinearProgress, TextField, Button, Stack,
  Alert, Tooltip, IconButton, InputAdornment, Tabs, Tab,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useI18nStore } from '@/stores';
import { I18N_CATALOG } from '@/i18n/catalog';
import { useTranslation, useMissingTranslations } from '@/i18n/useTranslation';
import { LOCALES, formatDate, formatNumber, formatMoney } from '@/i18n';
import type { Locale } from '@/i18n';

/**
 * 多语言设置（A4 底座）
 *
 * 这个页面的定位不是「字典预览」，而是**翻译债的可见化面板**：
 *  · 覆盖进度条：一眼看出英文还有多少条没翻（诚实暴露，不藏）
 *  · 缺失清单：语言切到英文后，界面上出现过的、且没有英文的词条会被自动登记到这里
 *  · 现场补录：管理员直接填英文，写入 customTranslations（云端持久化），无需改代码重新发版
 */
const I18nSettings: React.FC = () => {
  const { locale, setLocale, t } = useTranslation();
  const { customTranslations, setCustom, removeCustom } = useI18nStore();
  const { missing } = useMissingTranslations();

  const [tab, setTab] = useState(0);
  const [q, setQ] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const allKeys = useMemo(() => Object.keys(I18N_CATALOG).sort(), []);

  // 覆盖率：有英文的词条 / 全部词条
  const covered = useMemo(
    () => allKeys.filter((k) => I18N_CATALOG[k]?.['en-US']).length,
    [allKeys],
  );
  const coverage = allKeys.length > 0 ? Math.round((covered / allKeys.length) * 1000) / 10 : 0;

  const filteredKeys = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return allKeys;
    return allKeys.filter((k) => {
      const e = I18N_CATALOG[k];
      return (
        k.toLowerCase().includes(kw) ||
        (e?.['zh-CN'] ?? '').includes(kw) ||
        (e?.['en-US'] ?? '').toLowerCase().includes(kw)
      );
    });
  }, [allKeys, q]);

  // 需要补录：缺失清单优先，其次是已补录的
  const pendingKeys = useMemo(() => {
    const seen = new Set<string>();
    const out: { key: string; zh: string; done: boolean }[] = [];
    for (const m of missing) {
      if (seen.has(m.key)) continue;
      seen.add(m.key);
      out.push({ key: m.key, zh: m.zh, done: false });
    }
    for (const [k, v] of Object.entries(customTranslations)) {
      if (seen.has(k)) continue;
      out.push({ key: k, zh: I18N_CATALOG[k]?.['zh-CN'] ?? '', done: true, ...{ _v: v } } as never);
    }
    return out;
  }, [missing, customTranslations]);

  const saveDraft = (key: string) => {
    const v = (drafts[key] ?? '').trim();
    if (!v) return;
    setCustom(key, v);
    setDrafts((d) => {
      const n = { ...d };
      delete n[key];
      return n;
    });
  };

  return (
    <Box sx={{ p: 3 }} data-testid="i18n">
      <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 700 }}>
        {t('page.i18n', '多语言')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        语言切换立即生效并云端保存；缺失词条自动回退中文，可在本页现场补录，无需重新发版。
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel>{t('field.language', '界面语言')}</InputLabel>
            <Select
              data-testid="i18n-locale"
              value={locale}
              label={t('field.language', '界面语言')}
              onChange={(e) => setLocale(e.target.value as Locale)}
            >
              {LOCALES.map((l) => (
                <MenuItem key={l.value} value={l.value}>{l.nativeLabel}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flex: 1 }} />
          <Chip
            icon={<CheckCircleIcon />}
            size="small"
            color={coverage >= 100 ? 'success' : 'default'}
            label={`英文覆盖 ${covered}/${allKeys.length} 条（${coverage}%）`}
          />
        </Stack>
        <LinearProgress
          variant="determinate"
          value={coverage}
          sx={{ mt: 2, height: 6, borderRadius: 3 }}
        />
        {coverage < 100 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            剩余 {allKeys.length - covered} 条尚未翻译 —— 切到英文时这些位置显示中文原文（不会是裸 key）。
            这是有意的取舍：宁可局部显示中文，也不做没有人工校对的机翻。
          </Typography>
        )}
      </Paper>

      {/* 格式随语言变化：避免「英文界面 + 中文日期」的假国际化 */}
      <Paper sx={{ p: 2, mb: 2 }} data-testid="i18n-format-preview">
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('page.i18nFormat', '本地化格式预览')}</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
          <Box>
            <Typography variant="caption" color="text.secondary">{t('field.date', '日期')}</Typography>
            <Typography variant="body2" fontFamily="monospace">{formatDate('2026-09-15', locale)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">{t('field.quantity', '数量')}</Typography>
            <Typography variant="body2" fontFamily="monospace">{formatNumber(1234567.5, locale)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">{t('field.amount', '金额')}</Typography>
            <Typography variant="body2" fontFamily="monospace">{formatMoney(1234567.5, 'CNY', locale)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">{t('field.rate', '汇率')}</Typography>
            <Typography variant="body2" fontFamily="monospace">{formatNumber(7.1234, locale, 4)}</Typography>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
          <Tab
            label={missing.length > 0 ? `${t('page.i18nPending', '待补录')} (${pendingKeys.length})` : t('page.i18nPending', '待补录')}
          />
          <Tab label={`${t('page.i18nAll', '全部词条')} (${allKeys.length})`} />
        </Tabs>

        {tab === 0 && (
          <>
            {pendingKeys.length === 0 ? (
              <Alert severity="success" icon={<CheckCircleIcon />}>
                当前没有待补录词条。切到英文并浏览各页面后，界面上出现但缺英文的词条会在这里自动出现。
              </Alert>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  这些是<b>切到英文时界面上真实出现过、且还没有英文</b>的词条。填写后立即生效并云端保存。
                </Alert>
                <Table size="small" data-testid="i18n-missing-table">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 200 }}>Key</TableCell>
                      <TableCell>中文原文</TableCell>
                      <TableCell>English</TableCell>
                      <TableCell align="right" sx={{ width: 110 }}>{t('common.operation', '操作')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingKeys.map((row) => (
                      <TableRow key={row.key} data-testid="i18n-missing-row">
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace">{row.key}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.zh || I18N_CATALOG[row.key]?.['zh-CN'] || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            placeholder="Type English…"
                            value={drafts[row.key] ?? customTranslations[row.key] ?? ''}
                            onChange={(e) => setDrafts((d) => ({ ...d, [row.key]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveDraft(row.key); }}
                            inputProps={{ 'data-testid': 'i18n-missing-input' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
                            disabled={!(drafts[row.key] ?? '').trim()}
                            onClick={() => saveDraft(row.key)}
                          >
                            {t('common.save', '保存')}
                          </Button>
                          {customTranslations[row.key] && (
                            <Tooltip title={t('page.i18nReset', '清除该条补录，恢复为中文回退')}>
                              <IconButton size="small" onClick={() => removeCustom(row.key)}>
                                <RestartAltIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </>
        )}

        {tab === 1 && (
          <>
            <TextField
              size="small"
              placeholder={t('common.search', '查询')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ mb: 1.5, maxWidth: 320 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment>
                ),
              }}
            />
            <Table size="small" data-testid="i18n-dict-table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 240 }}>Key</TableCell>
                  <TableCell>简体中文</TableCell>
                  <TableCell>English</TableCell>
                  <TableCell align="right" sx={{ width: 100 }}>{t('common.status', '状态')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredKeys.map((k) => {
                  const e = I18N_CATALOG[k];
                  const en = customTranslations[k] ?? e?.['en-US'];
                  return (
                    <TableRow key={k} data-testid="i18n-dict-row" hover>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">{k}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{e?.['zh-CN']}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={en ? 'text.primary' : 'text.disabled'}>
                          {en ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {en ? (
                          <Chip
                            size="small"
                            color={customTranslations[k] ? 'primary' : 'success'}
                            variant="outlined"
                            label={customTranslations[k] ? t('page.i18nManual', '人工补录') : t('page.i18nBuiltin', '内置')}
                          />
                        ) : (
                          <Chip size="small" variant="outlined" label={t('page.i18nFallback', '回退中文')} />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredKeys.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                {t('common.noData', '暂无符合条件的数据')}
              </Typography>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default I18nSettings;
