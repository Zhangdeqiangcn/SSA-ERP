-- V3.86.0 历史遗留整改：未填写的「本次必填项」由空串规范为 NULL（强哥要求）
-- 背景：主数据必填收口后，历史数据里被留成空串 '' 的字段应还原为「真正未填写」的 NULL，
--       避免「看似填了、其实空串」的假数据糊弄后续统计与检索。
-- 范围：仅本次纳入必填、且物理上可空（notnull=0）的列。NOT NULL 的商务键（如
--       materials.code/name/unit、customers.code/name、warehouses.code/name）
--       本就不可为 NULL，也不存在「未填写」问题，故不纳入（强行置 NULL 会违反约束报错）。
-- 幂等：TRIM(...)='' 判定 + SET NULL，重复执行结果一致，可安全反复 apply。
-- 不删行、不填假值，只把「空串」还原成「空」。

-- 物料：规格型号（可空，本次新增必填）
UPDATE materials SET specification = NULL
  WHERE specification IS NOT NULL AND TRIM(specification) = '';

-- 供应商：编码 / 名称（vendor_master 两列可空）
UPDATE vendor_master SET vendor_code = NULL
  WHERE vendor_code IS NOT NULL AND TRIM(vendor_code) = '';
UPDATE vendor_master SET company_name = NULL
  WHERE company_name IS NOT NULL AND TRIM(company_name) = '';
