-- V3.94.0 采购申请增加「采购员归属」字段
-- 来源：物料分类按职能维护的采购员（responsiblePersons.buyer）。
-- 采购申请创建时反查物料所属分类的采购员，写入本单归属采购员，
-- 用于：① 自动通知采购员办理（站内消息）；② 采购申请列表按采购员姓名筛选。
-- buyer_ids 为 JSON 数组（本单归属的采购员 id，可能多家分类对应多名采购员）；
-- buyer_names 为逗号拼接姓名（用于列表展示与按姓名模糊筛选）。
ALTER TABLE purchase_requests ADD COLUMN buyer_ids TEXT;
ALTER TABLE purchase_requests ADD COLUMN buyer_names TEXT;
