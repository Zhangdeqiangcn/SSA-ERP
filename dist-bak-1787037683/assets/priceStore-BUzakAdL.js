import { a as create, p as persist } from "./vendor-46QZWBd3.js";
import { l as backendStorage, u as useMaterialStore } from "./index-CcOZBoQL.js";
const priceInquiries = [
  {
    id: "inq-001",
    inquiryNo: "IQ20240508001",
    title: "钢板Q235B + H型钢Q345B询价",
    inquiryDate: "2024-05-08",
    inquirer: "张华",
    department: "采购部",
    items: [
      {
        id: "inqi-001",
        materialId: "mat-001",
        materialCode: "MAT202405010001",
        materialName: "钢板 Q235B",
        specification: "10mm*1500mm*6000mm",
        unit: "吨",
        quantity: 30,
        requiredDate: "2024-06-01",
        estimatedPrice: 4200,
        estimatedAmount: 126e3,
        sourceRequestId: "pr-001",
        sourceRequestNo: "PR20240501001"
      },
      {
        id: "inqi-002",
        materialId: "mat-003",
        materialCode: "MAT202405010003",
        materialName: "H型钢 Q345B",
        specification: "HM300*200*8*12",
        unit: "吨",
        quantity: 15,
        requiredDate: "2024-06-05",
        estimatedPrice: 4800,
        estimatedAmount: 72e3,
        sourceRequestId: "pr-005",
        sourceRequestNo: "PR20240505001"
      }
    ],
    targetVendorIds: ["ven-001", "ven-003", "ven-005"],
    targetVendorNames: ["上海宝钢钢铁贸易有限公司", "武汉钢铁集团有限公司", "江苏南京南钢钢铁有限公司"],
    deadline: "2024-05-15",
    currency: "CNY",
    status: "published",
    totalEstimatedAmount: 198e3,
    remarks: "请各供应商在截止日期前提交报价，含税含运费到厂价",
    createdAt: "2024-05-08 09:00:00",
    updatedAt: "2024-05-08 09:30:00",
    createdBy: "张华",
    updatedBy: "张华"
  },
  {
    id: "inq-002",
    inquiryNo: "IQ20240510001",
    title: "紧固件批量询价",
    inquiryDate: "2024-05-10",
    inquirer: "张华",
    department: "采购部",
    items: [
      {
        id: "inqi-003",
        materialId: "mat-004",
        materialCode: "MAT202405010004",
        materialName: "螺栓 M10",
        specification: "M10*40 10.9级",
        unit: "套",
        quantity: 500,
        requiredDate: "2024-06-10",
        estimatedPrice: 2.5,
        estimatedAmount: 1250,
        sourceRequestId: "pr-002",
        sourceRequestNo: "PR20240502001"
      },
      {
        id: "inqi-004",
        materialId: "mat-005",
        materialCode: "MAT202405010005",
        materialName: "螺栓 M12",
        specification: "M12*50 8.8级",
        unit: "套",
        quantity: 300,
        requiredDate: "2024-06-10",
        estimatedPrice: 3.2,
        estimatedAmount: 960,
        sourceRequestId: "pr-002",
        sourceRequestNo: "PR20240502001"
      },
      {
        id: "inqi-005",
        materialId: "mat-006",
        materialCode: "MAT202405010006",
        materialName: "螺母 M10",
        specification: "M10 10级",
        unit: "个",
        quantity: 1e3,
        requiredDate: "2024-06-10",
        estimatedPrice: 0.8,
        estimatedAmount: 800,
        sourceRequestId: "pr-002",
        sourceRequestNo: "PR20240502001"
      }
    ],
    targetVendorIds: ["ven-002", "ven-009"],
    targetVendorNames: ["浙江温州紧固件有限公司", "河南郑州中原标准件有限公司"],
    deadline: "2024-05-18",
    currency: "CNY",
    status: "published",
    totalEstimatedAmount: 3010,
    remarks: "标准紧固件，要求符合国标",
    createdAt: "2024-05-10 10:00:00",
    updatedAt: "2024-05-10 10:00:00",
    createdBy: "张华",
    updatedBy: "张华"
  },
  {
    id: "inq-003",
    inquiryNo: "IQ20240512001",
    title: "电气元件询价",
    inquiryDate: "2024-05-12",
    inquirer: "李明",
    department: "采购部",
    items: [
      {
        id: "inqi-006",
        materialId: "mat-009",
        materialCode: "MAT202405010009",
        materialName: "交流接触器 CJX2",
        specification: "CJX2-0910 AC220V",
        unit: "个",
        quantity: 20,
        requiredDate: "2024-06-15",
        estimatedPrice: 128,
        estimatedAmount: 2560,
        sourceRequestId: "pr-003",
        sourceRequestNo: "PR20240503001"
      },
      {
        id: "inqi-007",
        materialId: "mat-010",
        materialCode: "MAT202405010010",
        materialName: "断路器 DZ47",
        specification: "DZ47-63 C32 3P",
        unit: "个",
        quantity: 10,
        requiredDate: "2024-06-15",
        estimatedPrice: 85,
        estimatedAmount: 850,
        sourceRequestId: "pr-003",
        sourceRequestNo: "PR20240503001"
      }
    ],
    targetVendorIds: ["ven-004"],
    targetVendorNames: ["深圳华强电气有限公司"],
    deadline: "2024-05-20",
    currency: "CNY",
    status: "draft",
    totalEstimatedAmount: 3410,
    createdAt: "2024-05-12 08:00:00",
    updatedAt: "2024-05-12 08:00:00",
    createdBy: "李明",
    updatedBy: "李明"
  },
  {
    id: "inq-004",
    inquiryNo: "IQ20240515001",
    title: "焊条采购询价",
    inquiryDate: "2024-05-15",
    inquirer: "张华",
    department: "采购部",
    items: [
      {
        id: "inqi-008",
        materialId: "mat-007",
        materialCode: "MAT202405010007",
        materialName: "焊条 E4303",
        specification: "Φ3.2mm*350mm",
        unit: "盒",
        quantity: 50,
        requiredDate: "2024-06-20",
        estimatedPrice: 45,
        estimatedAmount: 2250,
        sourceRequestId: "pr-004",
        sourceRequestNo: "PR20240504001"
      }
    ],
    targetVendorIds: ["ven-001", "ven-003"],
    targetVendorNames: ["上海宝钢钢铁贸易有限公司", "武汉钢铁集团有限公司"],
    deadline: "2024-05-22",
    currency: "CNY",
    status: "closed",
    totalEstimatedAmount: 2250,
    remarks: "要求E4303标准焊条，品牌不限",
    createdAt: "2024-05-15 14:00:00",
    updatedAt: "2024-05-23 09:00:00",
    createdBy: "张华",
    updatedBy: "张华"
  }
];
const vendorQuotations = [
  // 针对 inq-001 (钢板+H型钢) 的报价
  {
    id: "vq-001",
    quotationNo: "VQ20240509001",
    inquiryId: "inq-001",
    inquiryNo: "IQ20240508001",
    vendorId: "ven-001",
    vendorName: "上海宝钢钢铁贸易有限公司",
    vendorContact: "张建国",
    vendorPhone: "021-55881234",
    quotationDate: "2024-05-09",
    items: [
      {
        id: "vqi-001",
        inquiryItemId: "inqi-001",
        materialId: "mat-001",
        materialCode: "MAT202405010001",
        materialName: "钢板 Q235B",
        specification: "10mm*1500mm*6000mm",
        unit: "吨",
        quantity: 30,
        unitPrice: 4100,
        amount: 123e3,
        deliveryDays: 15,
        deliveryDate: "2024-06-15"
      },
      {
        id: "vqi-002",
        inquiryItemId: "inqi-002",
        materialId: "mat-003",
        materialCode: "MAT202405010003",
        materialName: "H型钢 Q345B",
        specification: "HM300*200*8*12",
        unit: "吨",
        quantity: 15,
        unitPrice: 4700,
        amount: 70500,
        deliveryDays: 18,
        deliveryDate: "2024-06-20"
      }
    ],
    totalAmount: 193500,
    validUntil: "2024-05-30",
    paymentTerms: "预付30%，货到验收后60天付清",
    deliveryTerms: "FOB上海，含运费到厂",
    currency: "CNY",
    status: "submitted",
    remarks: "宝钢正品，随货附质保书",
    submittedAt: "2024-05-09 15:00:00",
    createdAt: "2024-05-09 10:00:00",
    updatedAt: "2024-05-09 15:00:00"
  },
  {
    id: "vq-002",
    quotationNo: "VQ20240510001",
    inquiryId: "inq-001",
    inquiryNo: "IQ20240508001",
    vendorId: "ven-003",
    vendorName: "武汉钢铁集团有限公司",
    vendorContact: "刘明辉",
    vendorPhone: "027-86234567",
    quotationDate: "2024-05-10",
    items: [
      {
        id: "vqi-003",
        inquiryItemId: "inqi-001",
        materialId: "mat-001",
        materialCode: "MAT202405010001",
        materialName: "钢板 Q235B",
        specification: "10mm*1500mm*6000mm",
        unit: "吨",
        quantity: 30,
        unitPrice: 4050,
        amount: 121500,
        deliveryDays: 12,
        deliveryDate: "2024-06-10"
      },
      {
        id: "vqi-004",
        inquiryItemId: "inqi-002",
        materialId: "mat-003",
        materialCode: "MAT202405010003",
        materialName: "H型钢 Q345B",
        specification: "HM300*200*8*12",
        unit: "吨",
        quantity: 15,
        unitPrice: 4600,
        amount: 69e3,
        deliveryDays: 14,
        deliveryDate: "2024-06-15"
      }
    ],
    totalAmount: 190500,
    validUntil: "2024-05-28",
    paymentTerms: "货到验收后30天付清",
    deliveryTerms: "含运费到厂",
    currency: "CNY",
    status: "submitted",
    remarks: "武钢正品，量大可优惠",
    submittedAt: "2024-05-10 11:00:00",
    createdAt: "2024-05-10 08:00:00",
    updatedAt: "2024-05-10 11:00:00"
  },
  {
    id: "vq-003",
    quotationNo: "VQ20240511001",
    inquiryId: "inq-001",
    inquiryNo: "IQ20240508001",
    vendorId: "ven-005",
    vendorName: "江苏南京南钢钢铁有限公司",
    vendorContact: "周强",
    vendorPhone: "025-58234567",
    quotationDate: "2024-05-11",
    items: [
      {
        id: "vqi-005",
        inquiryItemId: "inqi-001",
        materialId: "mat-001",
        materialCode: "MAT202405010001",
        materialName: "钢板 Q235B",
        specification: "10mm*1500mm*6000mm",
        unit: "吨",
        quantity: 30,
        unitPrice: 4150,
        amount: 124500,
        deliveryDays: 10,
        deliveryDate: "2024-06-08"
      },
      {
        id: "vqi-006",
        inquiryItemId: "inqi-002",
        materialId: "mat-003",
        materialCode: "MAT202405010003",
        materialName: "H型钢 Q345B",
        specification: "HM300*200*8*12",
        unit: "吨",
        quantity: 15,
        unitPrice: 4750,
        amount: 71250,
        deliveryDays: 12,
        deliveryDate: "2024-06-12"
      }
    ],
    totalAmount: 195750,
    validUntil: "2024-05-25",
    paymentTerms: "预付20%，货到付80%",
    deliveryTerms: "自提或代发物流",
    currency: "CNY",
    status: "submitted",
    remarks: "南钢品牌，交期优先",
    submittedAt: "2024-05-11 14:00:00",
    createdAt: "2024-05-11 09:00:00",
    updatedAt: "2024-05-11 14:00:00"
  },
  // 针对 inq-002 (紧固件) 的报价
  {
    id: "vq-004",
    quotationNo: "VQ20240512001",
    inquiryId: "inq-002",
    inquiryNo: "IQ20240510001",
    vendorId: "ven-002",
    vendorName: "浙江温州紧固件有限公司",
    vendorContact: "陈先生",
    vendorPhone: "0577-68123456",
    quotationDate: "2024-05-12",
    items: [
      {
        id: "vqi-007",
        inquiryItemId: "inqi-003",
        materialId: "mat-004",
        materialCode: "MAT202405010004",
        materialName: "螺栓 M10",
        specification: "M10*40 10.9级",
        unit: "套",
        quantity: 500,
        unitPrice: 2.3,
        amount: 1150,
        deliveryDays: 20,
        deliveryDate: "2024-06-15"
      },
      {
        id: "vqi-008",
        inquiryItemId: "inqi-004",
        materialId: "mat-005",
        materialCode: "MAT202405010005",
        materialName: "螺栓 M12",
        specification: "M12*50 8.8级",
        unit: "套",
        quantity: 300,
        unitPrice: 3,
        amount: 900,
        deliveryDays: 20,
        deliveryDate: "2024-06-15"
      },
      {
        id: "vqi-009",
        inquiryItemId: "inqi-005",
        materialId: "mat-006",
        materialCode: "MAT202405010006",
        materialName: "螺母 M10",
        specification: "M10 10级",
        unit: "个",
        quantity: 1e3,
        unitPrice: 0.75,
        amount: 750,
        deliveryDays: 20,
        deliveryDate: "2024-06-15"
      }
    ],
    totalAmount: 2800,
    validUntil: "2024-05-30",
    paymentTerms: "月结60天",
    deliveryTerms: "含运费到厂",
    currency: "CNY",
    status: "submitted",
    remarks: "温州原产，质量有保证",
    submittedAt: "2024-05-12 09:00:00",
    createdAt: "2024-05-12 08:00:00",
    updatedAt: "2024-05-12 09:00:00"
  },
  {
    id: "vq-005",
    quotationNo: "VQ20240513001",
    inquiryId: "inq-002",
    inquiryNo: "IQ20240510001",
    vendorId: "ven-009",
    vendorName: "河南郑州中原标准件有限公司",
    vendorContact: "赵先生",
    vendorPhone: "0371-68123456",
    quotationDate: "2024-05-13",
    items: [
      {
        id: "vqi-010",
        inquiryItemId: "inqi-003",
        materialId: "mat-004",
        materialCode: "MAT202405010004",
        materialName: "螺栓 M10",
        specification: "M10*40 10.9级",
        unit: "套",
        quantity: 500,
        unitPrice: 2.4,
        amount: 1200,
        deliveryDays: 15,
        deliveryDate: "2024-06-10"
      },
      {
        id: "vqi-011",
        inquiryItemId: "inqi-004",
        materialId: "mat-005",
        materialCode: "MAT202405010005",
        materialName: "螺栓 M12",
        specification: "M12*50 8.8级",
        unit: "套",
        quantity: 300,
        unitPrice: 3.1,
        amount: 930,
        deliveryDays: 15,
        deliveryDate: "2024-06-10"
      },
      {
        id: "vqi-012",
        inquiryItemId: "inqi-005",
        materialId: "mat-006",
        materialCode: "MAT202405010006",
        materialName: "螺母 M10",
        specification: "M10 10级",
        unit: "个",
        quantity: 1e3,
        unitPrice: 0.7,
        amount: 700,
        deliveryDays: 15,
        deliveryDate: "2024-06-10"
      }
    ],
    totalAmount: 2830,
    validUntil: "2024-05-25",
    paymentTerms: "货到付款",
    deliveryTerms: "包邮到厂",
    currency: "CNY",
    status: "submitted",
    remarks: "价格实惠，量大可谈",
    submittedAt: "2024-05-13 16:00:00",
    createdAt: "2024-05-13 14:00:00",
    updatedAt: "2024-05-13 16:00:00"
  }
];
const priceComparisons = [
  {
    id: "pc-001",
    comparisonNo: "PC20240516001",
    inquiryId: "inq-001",
    inquiryNo: "IQ20240508001",
    title: "钢板Q235B + H型钢Q345B比价",
    comparisonDate: "2024-05-16",
    items: [
      {
        materialId: "mat-001",
        materialCode: "MAT202405010001",
        materialName: "钢板 Q235B",
        specification: "10mm*1500mm*6000mm",
        unit: "吨",
        quantity: 30,
        quotations: [
          {
            vendorId: "ven-001",
            vendorName: "上海宝钢钢铁贸易有限公司",
            quotationId: "vq-001",
            quotationNo: "VQ20240509001",
            unitPrice: 4100,
            amount: 123e3,
            deliveryDays: 15,
            deliveryDate: "2024-06-15",
            paymentTerms: "预付30%",
            isLowest: false
          },
          {
            vendorId: "ven-003",
            vendorName: "武汉钢铁集团有限公司",
            quotationId: "vq-002",
            quotationNo: "VQ20240510001",
            unitPrice: 4050,
            amount: 121500,
            deliveryDays: 12,
            deliveryDate: "2024-06-10",
            paymentTerms: "货到30天",
            isLowest: true
          },
          {
            vendorId: "ven-005",
            vendorName: "江苏南京南钢钢铁有限公司",
            quotationId: "vq-003",
            quotationNo: "VQ20240511001",
            unitPrice: 4150,
            amount: 124500,
            deliveryDays: 10,
            deliveryDate: "2024-06-08",
            paymentTerms: "预付20%",
            isLowest: false
          }
        ],
        lowestVendorId: "ven-003",
        lowestVendorName: "武汉钢铁集团有限公司",
        lowestUnitPrice: 4050,
        lowestAmount: 121500,
        selectedVendorId: "ven-003",
        selectedVendorName: "武汉钢铁集团有限公司",
        selectedUnitPrice: 4050,
        selectedAmount: 121500
      },
      {
        materialId: "mat-003",
        materialCode: "MAT202405010003",
        materialName: "H型钢 Q345B",
        specification: "HM300*200*8*12",
        unit: "吨",
        quantity: 15,
        quotations: [
          {
            vendorId: "ven-001",
            vendorName: "上海宝钢钢铁贸易有限公司",
            quotationId: "vq-001",
            quotationNo: "VQ20240509001",
            unitPrice: 4700,
            amount: 70500,
            deliveryDays: 18,
            deliveryDate: "2024-06-20",
            paymentTerms: "预付30%",
            isLowest: false
          },
          {
            vendorId: "ven-003",
            vendorName: "武汉钢铁集团有限公司",
            quotationId: "vq-002",
            quotationNo: "VQ20240510001",
            unitPrice: 4600,
            amount: 69e3,
            deliveryDays: 14,
            deliveryDate: "2024-06-15",
            paymentTerms: "货到30天",
            isLowest: true
          },
          {
            vendorId: "ven-005",
            vendorName: "江苏南京南钢钢铁有限公司",
            quotationId: "vq-003",
            quotationNo: "VQ20240511001",
            unitPrice: 4750,
            amount: 71250,
            deliveryDays: 12,
            deliveryDate: "2024-06-12",
            paymentTerms: "预付20%",
            isLowest: false
          }
        ],
        lowestVendorId: "ven-003",
        lowestVendorName: "武汉钢铁集团有限公司",
        lowestUnitPrice: 4600,
        lowestAmount: 69e3,
        selectedVendorId: "ven-003",
        selectedVendorName: "武汉钢铁集团有限公司",
        selectedUnitPrice: 4600,
        selectedAmount: 69e3
      }
    ],
    participatingVendors: ["上海宝钢钢铁贸易有限公司", "武汉钢铁集团有限公司", "江苏南京南钢钢铁有限公司"],
    totalLowestAmount: 190500,
    totalSelectedAmount: 190500,
    status: "selected",
    selector: "张华",
    selectedAt: "2024-05-16 15:00:00",
    createdAt: "2024-05-16 08:00:00",
    updatedAt: "2024-05-16 15:00:00"
  },
  {
    id: "pc-002",
    comparisonNo: "PC20240518001",
    inquiryId: "inq-002",
    inquiryNo: "IQ20240510001",
    title: "紧固件批量比价",
    comparisonDate: "2024-05-18",
    items: [
      {
        materialId: "mat-004",
        materialCode: "MAT202405010004",
        materialName: "螺栓 M10",
        specification: "M10*40 10.9级",
        unit: "套",
        quantity: 500,
        quotations: [
          {
            vendorId: "ven-002",
            vendorName: "浙江温州紧固件有限公司",
            quotationId: "vq-004",
            quotationNo: "VQ20240512001",
            unitPrice: 2.3,
            amount: 1150,
            deliveryDays: 20,
            deliveryDate: "2024-06-15",
            paymentTerms: "月结60天",
            isLowest: true
          },
          {
            vendorId: "ven-009",
            vendorName: "河南郑州中原标准件有限公司",
            quotationId: "vq-005",
            quotationNo: "VQ20240513001",
            unitPrice: 2.4,
            amount: 1200,
            deliveryDays: 15,
            deliveryDate: "2024-06-10",
            paymentTerms: "货到付款",
            isLowest: false
          }
        ],
        lowestVendorId: "ven-002",
        lowestVendorName: "浙江温州紧固件有限公司",
        lowestUnitPrice: 2.3,
        lowestAmount: 1150
      },
      {
        materialId: "mat-005",
        materialCode: "MAT202405010005",
        materialName: "螺栓 M12",
        specification: "M12*50 8.8级",
        unit: "套",
        quantity: 300,
        quotations: [
          {
            vendorId: "ven-002",
            vendorName: "浙江温州紧固件有限公司",
            quotationId: "vq-004",
            quotationNo: "VQ20240512001",
            unitPrice: 3,
            amount: 900,
            deliveryDays: 20,
            deliveryDate: "2024-06-15",
            paymentTerms: "月结60天",
            isLowest: true
          },
          {
            vendorId: "ven-009",
            vendorName: "河南郑州中原标准件有限公司",
            quotationId: "vq-005",
            quotationNo: "VQ20240513001",
            unitPrice: 3.1,
            amount: 930,
            deliveryDays: 15,
            deliveryDate: "2024-06-10",
            paymentTerms: "货到付款",
            isLowest: false
          }
        ],
        lowestVendorId: "ven-002",
        lowestVendorName: "浙江温州紧固件有限公司",
        lowestUnitPrice: 3,
        lowestAmount: 900
      },
      {
        materialId: "mat-006",
        materialCode: "MAT202405010006",
        materialName: "螺母 M10",
        specification: "M10 10级",
        unit: "个",
        quantity: 1e3,
        quotations: [
          {
            vendorId: "ven-002",
            vendorName: "浙江温州紧固件有限公司",
            quotationId: "vq-004",
            quotationNo: "VQ20240512001",
            unitPrice: 0.75,
            amount: 750,
            deliveryDays: 20,
            deliveryDate: "2024-06-15",
            paymentTerms: "月结60天",
            isLowest: false
          },
          {
            vendorId: "ven-009",
            vendorName: "河南郑州中原标准件有限公司",
            quotationId: "vq-005",
            quotationNo: "VQ20240513001",
            unitPrice: 0.7,
            amount: 700,
            deliveryDays: 15,
            deliveryDate: "2024-06-10",
            paymentTerms: "货到付款",
            isLowest: true
          }
        ],
        lowestVendorId: "ven-009",
        lowestVendorName: "河南郑州中原标准件有限公司",
        lowestUnitPrice: 0.7,
        lowestAmount: 700
      }
    ],
    participatingVendors: ["浙江温州紧固件有限公司", "河南郑州中原标准件有限公司"],
    totalLowestAmount: 2750,
    status: "pending",
    createdAt: "2024-05-18 08:00:00",
    updatedAt: "2024-05-18 08:00:00"
  }
];
const priceApprovals = [
  {
    id: "pa-001",
    approvalNo: "PA20240517001",
    comparisonId: "pc-001",
    comparisonNo: "PC20240516001",
    inquiryId: "inq-001",
    inquiryNo: "IQ20240508001",
    title: "钢板+型钢采购价格审批（武汉钢铁）",
    applicant: "张华",
    applicationDate: "2024-05-17",
    items: [
      {
        materialId: "mat-001",
        materialCode: "MAT202405010001",
        materialName: "钢板 Q235B",
        specification: "10mm*1500mm*6000mm",
        unit: "吨",
        quantity: 30,
        selectedVendorId: "ven-003",
        selectedVendorName: "武汉钢铁集团有限公司",
        selectedUnitPrice: 4050,
        selectedAmount: 121500,
        deliveryDays: 12,
        deliveryDate: "2024-06-10",
        paymentTerms: "货到验收后30天付清"
      },
      {
        materialId: "mat-003",
        materialCode: "MAT202405010003",
        materialName: "H型钢 Q345B",
        specification: "HM300*200*8*12",
        unit: "吨",
        quantity: 15,
        selectedVendorId: "ven-003",
        selectedVendorName: "武汉钢铁集团有限公司",
        selectedUnitPrice: 4600,
        selectedAmount: 69e3,
        deliveryDays: 14,
        deliveryDate: "2024-06-15",
        paymentTerms: "货到验收后30天付清"
      }
    ],
    totalAmount: 190500,
    approvalRecords: [
      {
        id: "par-001",
        approver: "赵强",
        action: "approve",
        comments: "武汉钢铁价格合理，交期可接受，同意",
        operatedAt: "2024-05-17 10:00:00",
        nodeName: "采购经理审批"
      },
      {
        id: "par-002",
        approver: "王会计",
        action: "approve",
        comments: "预算内采购，财务同意",
        operatedAt: "2024-05-17 14:00:00",
        nodeName: "财务审批"
      }
    ],
    status: "approved",
    remarks: "武汉钢铁全线报价最低，且付款条件较好",
    createdAt: "2024-05-17 08:00:00",
    updatedAt: "2024-05-17 14:00:00",
    createdBy: "张华"
  },
  {
    id: "pa-002",
    approvalNo: "PA20240519001",
    comparisonId: "pc-002",
    comparisonNo: "PC20240518001",
    inquiryId: "inq-002",
    inquiryNo: "IQ20240510001",
    title: "紧固件采购价格审批",
    applicant: "张华",
    applicationDate: "2024-05-19",
    items: [
      {
        materialId: "mat-004",
        materialCode: "MAT202405010004",
        materialName: "螺栓 M10",
        specification: "M10*40 10.9级",
        unit: "套",
        quantity: 500,
        selectedVendorId: "ven-002",
        selectedVendorName: "浙江温州紧固件有限公司",
        selectedUnitPrice: 2.3,
        selectedAmount: 1150,
        deliveryDays: 20,
        deliveryDate: "2024-06-15",
        paymentTerms: "月结60天"
      },
      {
        materialId: "mat-005",
        materialCode: "MAT202405010005",
        materialName: "螺栓 M12",
        specification: "M12*50 8.8级",
        unit: "套",
        quantity: 300,
        selectedVendorId: "ven-002",
        selectedVendorName: "浙江温州紧固件有限公司",
        selectedUnitPrice: 3,
        selectedAmount: 900,
        deliveryDays: 20,
        deliveryDate: "2024-06-15",
        paymentTerms: "月结60天"
      },
      {
        materialId: "mat-006",
        materialCode: "MAT202405010006",
        materialName: "螺母 M10",
        specification: "M10 10级",
        unit: "个",
        quantity: 1e3,
        selectedVendorId: "ven-009",
        selectedVendorName: "河南郑州中原标准件有限公司",
        selectedUnitPrice: 0.7,
        selectedAmount: 700,
        deliveryDays: 15,
        deliveryDate: "2024-06-10",
        paymentTerms: "货到付款"
      }
    ],
    totalAmount: 2750,
    approvalRecords: [],
    status: "pending",
    createdAt: "2024-05-19 08:00:00",
    updatedAt: "2024-05-19 08:00:00",
    createdBy: "张华"
  }
];
const priceList = [
  {
    id: "pl-001",
    materialId: "mat-001",
    materialCode: "MAT202405010001",
    materialName: "钢板 Q235B",
    specification: "10mm*1500mm*6000mm",
    unit: "吨",
    vendorId: "ven-003",
    vendorName: "武汉钢铁集团有限公司",
    unitPrice: 4050,
    currency: "CNY",
    effectiveDate: "2024-05-18",
    expiryDate: "2029-12-31",
    sourceApprovalId: "pa-001",
    sourceApprovalNo: "PA20240517001",
    paymentTerms: "货到验收后30天付清",
    deliveryDays: 12,
    minOrderQty: 5,
    status: "active",
    createdAt: "2024-05-18 08:00:00",
    updatedAt: "2024-05-18 08:00:00",
    createdBy: "张华"
  },
  {
    id: "pl-002",
    materialId: "mat-003",
    materialCode: "MAT202405010003",
    materialName: "H型钢 Q345B",
    specification: "HM300*200*8*12",
    unit: "吨",
    vendorId: "ven-003",
    vendorName: "武汉钢铁集团有限公司",
    unitPrice: 4600,
    currency: "CNY",
    effectiveDate: "2024-05-18",
    expiryDate: "2029-12-31",
    sourceApprovalId: "pa-001",
    sourceApprovalNo: "PA20240517001",
    paymentTerms: "货到验收后30天付清",
    deliveryDays: 14,
    minOrderQty: 3,
    status: "active",
    createdAt: "2024-05-18 08:00:00",
    updatedAt: "2024-05-18 08:00:00",
    createdBy: "张华"
  },
  {
    id: "pl-003",
    materialId: "mat-004",
    materialCode: "MAT202405010004",
    materialName: "螺栓 M10",
    specification: "M10*40 10.9级",
    unit: "套",
    vendorId: "ven-002",
    vendorName: "浙江温州紧固件有限公司",
    unitPrice: 2.3,
    currency: "CNY",
    effectiveDate: "2024-05-18",
    sourceApprovalId: "pa-002",
    sourceApprovalNo: "PA20240519001",
    paymentTerms: "月结60天",
    deliveryDays: 20,
    minOrderQty: 100,
    status: "active",
    createdAt: "2024-05-18 08:00:00",
    updatedAt: "2024-05-18 08:00:00",
    createdBy: "张华"
  },
  {
    id: "pl-004",
    materialId: "mat-009",
    materialCode: "MAT202405010009",
    materialName: "交流接触器 CJX2",
    specification: "CJX2-0910 AC220V",
    unit: "个",
    vendorId: "ven-004",
    vendorName: "深圳华强电气有限公司",
    unitPrice: 125,
    currency: "CNY",
    effectiveDate: "2024-05-03",
    sourceApprovalId: "pa-legacy-001",
    sourceApprovalNo: "PA20240503001",
    paymentTerms: "月结30天",
    deliveryDays: 7,
    minOrderQty: 5,
    status: "active",
    createdAt: "2024-05-03 15:00:00",
    updatedAt: "2024-05-03 15:00:00",
    createdBy: "李明"
  },
  {
    id: "pl-005",
    materialId: "mat-010",
    materialCode: "MAT202405010010",
    materialName: "断路器 DZ47",
    specification: "DZ47-63 C32 3P",
    unit: "个",
    vendorId: "ven-004",
    vendorName: "深圳华强电气有限公司",
    unitPrice: 82,
    currency: "CNY",
    effectiveDate: "2024-05-03",
    sourceApprovalId: "pa-legacy-002",
    sourceApprovalNo: "PA20240503002",
    paymentTerms: "月结30天",
    deliveryDays: 7,
    minOrderQty: 5,
    status: "active",
    createdAt: "2024-05-03 15:00:00",
    updatedAt: "2024-05-03 15:00:00",
    createdBy: "李明"
  },
  {
    id: "pl-006",
    materialId: "mat-001",
    materialCode: "MAT202405010001",
    materialName: "钢板 Q235B",
    specification: "10mm*1500mm*6000mm",
    unit: "吨",
    vendorId: "ven-001",
    vendorName: "上海宝钢钢铁贸易有限公司",
    unitPrice: 4200,
    currency: "CNY",
    effectiveDate: "2024-01-01",
    expiryDate: "2029-12-31",
    sourceApprovalId: "pa-legacy-003",
    sourceApprovalNo: "PA20240101001",
    paymentTerms: "预付30%，货到60天",
    deliveryDays: 15,
    minOrderQty: 10,
    status: "active",
    createdAt: "2024-01-01 08:00:00",
    updatedAt: "2024-01-01 08:00:00",
    createdBy: "张华"
  }
];
const addArr = (setter, list, item) => [...list, item];
const updateArr = (setter, list, id, u) => list.map((x) => x.id === id ? { ...x, ...u } : x);
const deleteArr = (setter, list, id) => list.filter((x) => x.id !== id);
const usePriceStore = create()(
  persist(
    (set, get) => ({
      priceInquiries: [...priceInquiries],
      vendorQuotations: [...vendorQuotations],
      priceComparisons: [...priceComparisons],
      priceApprovals: [...priceApprovals],
      priceList: [...priceList],
      // Inquiry
      addPriceInquiry: (inquiry) => set((s) => ({ priceInquiries: addArr(set, s.priceInquiries, inquiry) })),
      updatePriceInquiry: (id, u) => set((s) => ({ priceInquiries: updateArr(set, s.priceInquiries, id, u) })),
      deletePriceInquiry: (id) => set((s) => ({ priceInquiries: deleteArr(set, s.priceInquiries, id) })),
      // Quotation
      addVendorQuotation: (q) => set((s) => ({ vendorQuotations: addArr(set, s.vendorQuotations, q) })),
      updateVendorQuotation: (id, u) => set((s) => ({ vendorQuotations: updateArr(set, s.vendorQuotations, id, u) })),
      deleteVendorQuotation: (id) => set((s) => ({ vendorQuotations: deleteArr(set, s.vendorQuotations, id) })),
      // Comparison
      addPriceComparison: (c) => set((s) => ({ priceComparisons: addArr(set, s.priceComparisons, c) })),
      updatePriceComparison: (id, u) => set((s) => ({ priceComparisons: updateArr(set, s.priceComparisons, id, u) })),
      deletePriceComparison: (id) => set((s) => ({ priceComparisons: deleteArr(set, s.priceComparisons, id) })),
      // Approval
      addPriceApproval: (a) => set((s) => ({ priceApprovals: addArr(set, s.priceApprovals, a) })),
      updatePriceApproval: (id, u) => set((s) => ({ priceApprovals: updateArr(set, s.priceApprovals, id, u) })),
      deletePriceApproval: (id) => set((s) => ({ priceApprovals: deleteArr(set, s.priceApprovals, id) })),
      // 审批通过 → 自动生成价目表（事件驱动）+ 回写物料主数据标准价（B6）
      approvePriceApproval: (id, record) => {
        const approval = get().priceApprovals.find((a) => a.id === id);
        if (!approval || approval.status === "approved") return;
        const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
        const newItems = approval.items.filter((it) => it.selectedVendorId).map((it) => ({
          id: `pl-${approval.id}-${it.materialId}`,
          materialId: it.materialId,
          materialCode: it.materialCode,
          materialName: it.materialName,
          specification: it.specification,
          unit: it.unit,
          vendorId: it.selectedVendorId,
          vendorName: it.selectedVendorName,
          unitPrice: it.selectedUnitPrice,
          currency: approval.currency || "CNY",
          effectiveDate: approval.applicationDate || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          sourceApprovalId: approval.id,
          sourceApprovalNo: approval.approvalNo,
          paymentTerms: it.paymentTerms,
          deliveryDays: it.deliveryDays,
          status: "active",
          // B6：审批通过即标记回写主数据
          writtenBack: true,
          syncedAt: now,
          erpPriceId: `ERP-${approval.id}-${it.materialId}`
        }));
        newItems.forEach((it) => {
          useMaterialStore.getState().updateMaterial(it.materialId, { standardPrice: it.unitPrice });
        });
        set((s) => {
          const existingKeys = new Set(s.priceList.map((p) => `${p.sourceApprovalId}|${p.materialId}`));
          const priceList2 = s.priceList.map((p) => {
            const key = `${p.sourceApprovalId}|${p.materialId}`;
            const hit = newItems.find((n) => `${n.sourceApprovalId}|${n.materialId}` === key);
            return hit ? {
              ...p,
              writtenBack: true,
              syncedAt: hit.syncedAt,
              erpPriceId: hit.erpPriceId,
              status: "active",
              unitPrice: hit.unitPrice,
              vendorId: hit.vendorId,
              vendorName: hit.vendorName
            } : p;
          });
          const appended = newItems.filter((it) => !existingKeys.has(`${it.sourceApprovalId}|${it.materialId}`));
          return {
            priceApprovals: s.priceApprovals.map(
              (a) => a.id === id ? { ...a, status: "approved", approvalRecords: [...a.approvalRecords || [], record] } : a
            ),
            priceList: [...priceList2, ...appended]
          };
        });
      },
      // 价目表选择器（B6）
      getActivePrice: (vendorId, materialId) => {
        return get().priceList.find(
          (p) => p.vendorId === vendorId && p.materialId === materialId && p.status === "active"
        );
      },
      // PriceList
      addPriceListItem: (item) => set((s) => ({ priceList: addArr(set, s.priceList, item) })),
      updatePriceListItem: (id, u) => set((s) => ({ priceList: updateArr(set, s.priceList, id, u) })),
      setPriceList: (list) => set({ priceList: list })
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-price",
      version: 1,
      partialize: (state) => ({
        priceInquiries: state.priceInquiries,
        vendorQuotations: state.vendorQuotations,
        priceComparisons: state.priceComparisons,
        priceApprovals: state.priceApprovals,
        priceList: state.priceList
      })
    }
  )
);
export {
  usePriceStore as u
};
