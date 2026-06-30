# POS Analytics - Quick Start Guide

## 🚀 What You Can Do Now

Four new analytics endpoints are available:

```bash
# 1. Top products by revenue
GET /pos/analytics/top-products?limit=10

# 2. Top employees by sales
GET /pos/analytics/top-employees?limit=10

# 3. All employees' sales breakdown
GET /pos/analytics/employees

# 4. Detailed product sales table (price, cost, quantity, revenue, profit)
GET /pos/analytics/products
```

## 📊 Quick Examples

### Today's top 5 products

```bash
GET /pos/analytics/top-products?limit=5&startDate=2024-11-19&endDate=2024-11-19
```

### This month's top employees

```bash
GET /pos/analytics/top-employees?limit=10&startDate=2024-11-01&endDate=2024-11-30
```

### Product profitability report

```bash
GET /pos/analytics/products?startDate=2024-01-01
```

### Session-specific analytics

```bash
GET /pos/analytics/top-products?posSessionId=123
```

## 🔧 Available Filters

| Filter         | Description                      | Example                 |
| -------------- | -------------------------------- | ----------------------- |
| `limit`        | Max results (top endpoints only) | `?limit=5`              |
| `startDate`    | From date (ISO 8601)             | `?startDate=2024-11-01` |
| `endDate`      | To date (ISO 8601)               | `?endDate=2024-11-30`   |
| `posSessionId` | Filter by session                | `?posSessionId=123`     |
| `posId`        | Filter by terminal               | `?posId=1`              |

## 📖 Full Documentation

- **API Reference:** `POS_ANALYTICS_API.md`
- **Implementation Details:** `POS_ANALYTICS_IMPLEMENTATION_GUIDE.md`
- **Summary:** `POS_ANALYTICS_SUMMARY.md`

## ✅ What Each Endpoint Returns

### `/top-products` - Best Sellers

```json
{
  "productId": 1,
  "productName": "Laptop Dell XPS",
  "totalQuantity": 150,
  "totalRevenue": 225000,
  "averagePrice": 1500
}
```

### `/top-employees` - Top Performers

```json
{
  "employeeId": "emp-001",
  "employeeName": "John Doe",
  "totalSales": 450000,
  "transactionCount": 250,
  "averageTransactionValue": 1800
}
```

### `/employees` - All Staff Sales

Same as top-employees but returns ALL employees (no limit)

### `/products` - Profitability Analysis

```json
{
  "productId": 1,
  "productName": "Laptop",
  "salePrice": 1500,
  "purchasePrice": 1200,
  "totalQuantitySold": 150,
  "totalRevenue": 225000,
  "totalCost": 180000,
  "grossProfit": 45000,
  "profitMargin": 20
}
```

## 🧪 Testing

Run the test suite:

```bash
npm test pos-analytics
```

## 🎯 Common Use Cases

| Use Case                 | Endpoint         | Filters                          |
| ------------------------ | ---------------- | -------------------------------- |
| Daily sales report       | `/products`      | `posId=1&startDate=today`        |
| Monthly leaderboard      | `/top-employees` | `limit=10&startDate=month-start` |
| Low-margin products      | `/products`      | Check `profitMargin` field       |
| Session summary          | `/top-products`  | `posSessionId=123`               |
| Year-to-date performance | `/products`      | `startDate=2024-01-01`           |

## 🔐 Authentication

All endpoints require authentication (inherits from your app's auth system).

## ⚠️ Important Notes

1. **Returns are excluded** from product analytics
2. **Returns are included** in employee analytics
3. **Profit metrics are null** if product has no purchase price
4. **All dates are ISO 8601 format** (YYYY-MM-DD or full timestamp)
5. **Results sorted by revenue** (highest first)

## 🆘 Troubleshooting

**No data returned?**

- Verify transactions have `isPOS: true`
- Check `cashierId` is set on invoices
- Ensure correct date format

**Wrong calculations?**

- Verify `purchasePrice` set on products
- Check invoice items have correct prices/quantities

**Slow queries?**

- Use date range filters
- Consider shorter time periods
- Check database indexes exist

## 📞 Need Help?

1. Read `POS_ANALYTICS_API.md` for detailed API docs
2. Check `POS_ANALYTICS_IMPLEMENTATION_GUIDE.md` for technical details
3. Review test files for usage examples
