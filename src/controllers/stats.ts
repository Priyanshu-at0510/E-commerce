import { myCache } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { User } from "../models/user.js";
import { calculatePercentage, getChartData } from "../utils/features.js";

export const getdashboardStats = TryCatch(async (req, res, next) => {
  let stats;
  if (myCache.has("admin-stats"))
    stats = JSON.parse(myCache.get("admin-stats") as string);
  else {
    //Revenue , user , trsansactions , product
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    );

    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const thisMonthProductsPromis = Product.find({
      createdAt: {
        $gte: startOfThisMonth,
        $lte: today,
      },
    });

    const lastMonthProductsPromis = Product.find({
      createdAt: {
        $gte: startOfLastMonth,
        $lte: endOfLastMonth,
      },
    });

    const thisMonthUserPromis = User.find({
      createdAt: {
        $gte: startOfThisMonth,
        $lte: today,
      },
    });

    const lastMonthUserPromis = User.find({
      createdAt: {
        $gte: startOfLastMonth,
        $lte: endOfLastMonth,
      },
    });

    const thisMonthOrderPromis = Order.find({
      createdAt: {
        $gte: startOfThisMonth,
        $lte: today,
      },
    });

    const lastMonthOrderPromis = Order.find({
      createdAt: {
        $gte: startOfLastMonth,
        $lte: endOfLastMonth,
      },
    });

    const lastSixMonthOrderPromise = Order.find({
      createdAt: {
        $gte: sixMonthsAgo,
        $lte: today,
      },
    });

    const latestTransactionsPromise = Order.find({})
      .select(["orderItems", "discount", "total", "status"])
      .limit(4);

    const [
      thisMonthProducts,
      thisMonthUsers,
      thisMonthOrders,
      lastMonthProducts,
      lastMonthUsers,
      lastMonthOrders,
      productCount,
      userCount,
      allOrders,

      lastSixMonthOrder,
      categories,

      femaleUsersCount,

      latestTrasaction,
    ] = await Promise.all([
      thisMonthProductsPromis,
      thisMonthUserPromis,
      thisMonthOrderPromis,
      lastMonthProductsPromis,
      lastMonthUserPromis,
      lastMonthOrderPromis,
      Product.countDocuments(),
      User.countDocuments(),
      Order.find({}).select("total"),
      lastSixMonthOrderPromise,
      Product.distinct("category"),
      User.countDocuments({ gender: "female" }),

      latestTransactionsPromise,
    ]);

    const thisMonthRevenue = thisMonthOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );

    const lastMonthrevenue = lastMonthOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );

    //percentage =( thisMonth-lastmonth)/lastmonth * 100
    const changePercent = {
      revenue: calculatePercentage(thisMonthRevenue, lastMonthrevenue),
      product: calculatePercentage(
        thisMonthProducts.length,
        lastMonthUsers.length
      ),
      user: calculatePercentage(
        thisMonthUsers.length,
        lastMonthProducts.length
      ),
      order: calculatePercentage(
        thisMonthOrders.length,
        lastMonthOrders.length
      ),
    };

    const revenue = allOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );

    const count = {
      revenue,
      user: userCount,
      product: productCount,
      order: allOrders.length,
    };

    const orderMonthCounts = new Array(6).fill(0);
    const orderMonthlyRevenue = new Array(6).fill(0);

    lastSixMonthOrder.forEach((order) => {
      const creationDate = order.createdAt;
      const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;

      if (monthDiff < 6) {
        orderMonthCounts[6 - monthDiff - 1]++;
        orderMonthlyRevenue[6 - monthDiff - 1] += order.total;
      }
    });

    // percent distrribution for each category
    const categoriesCountPromise = categories.map((category) =>
      Product.countDocuments({ category })
    );

    const categoriesCount = await Promise.all(categoriesCountPromise);
    //now array categories count has count for each category

    const categoryCount: { category: string; count: number }[] = [];
    categories.forEach((category, index) => {
      categoryCount.push({
        category,
        count: Math.round((categoriesCount[index] / productCount) * 100),
      });
    });

    const UsersRatio = {
      male: userCount - femaleUsersCount,
      female: femaleUsersCount,
    };

    const modifiedlatestTrasaction = latestTrasaction.map((transaction) => ({
      _id: transaction._id,
      discount: transaction.discount,
      amount: transaction.total,
      quantity: transaction.orderItems.length,
      status: transaction.status,
    }));

    stats = {
      changePercent,
      count,
      chart: {
        orderMonthCounts,
        orderMonthlyRevenue,
      },
      categoryCount,
      UsersRatio,
      latestTrasaction: modifiedlatestTrasaction,
    };

    //cache this data
    myCache.set("admin-stats", JSON.stringify(stats));
  }

  return res.status(200).json({
    success: true,
    stats,
  });
});

export const getPieChart = TryCatch(async (req, res, next) => {
  // order full-fillment
  let charts;

  if (myCache.has("admin-pie-charts")) {
    charts = JSON.parse(myCache.get("admin-pie-charts") as string);
  } else {
    const [
      proOrder,
      shidOrder,
      delOrder,
      categories,
      productCount,
      productsOutStock,
      allOrders,
      allusers,
      adminCount,
      customerCount,
    ] = await Promise.all([
      Order.countDocuments({ status: "Processing" }),
      Order.countDocuments({ status: "Shipped" }),
      Order.countDocuments({ status: "Delivered" }),
      Product.distinct("category"),
      Product.countDocuments(),
      Product.countDocuments({ stock: 0 }),
      Order.find({}).select([
        "total",
        "discount",
        "subTotal",
        "tax",
        "shippingCharges",
      ]),

      User.find({}).select(["dob"]),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "user" }),
    ]);

    const orderFullfillment = {
      processing: proOrder,
      shipped: shidOrder,
      delivered: delOrder,
    };

    //product category ratio

    // percent distribution for each category
    const categoriesCountPromise = categories.map((category) =>
      Product.countDocuments({ category })
    );

    const categoriesCount = await Promise.all(categoriesCountPromise);
    //now array categories count has count for each category

    const categoryCount: { category: string; count: number }[] = [];
    categories.forEach((category, index) => {
      categoryCount.push({
        category,
        count: Math.round((categoriesCount[index] / productCount) * 100),
      });
    });

    const stockAvailablity = {
      inStock: productCount - productsOutStock,
      outOfStock: productsOutStock,
    };

    const grossIncome = allOrders.reduce(
      (prev, order) => prev + (order.total || 0),
      0
    );

    const discount = allOrders.reduce(
      (prev, order) => prev + (order.discount || 0),
      0
    );

    const productionCost = allOrders.reduce(
      (prev, order) => prev + (order.shippingCharges || 0),
      0
    );

    const burnt = allOrders.reduce((prev, order) => prev + (order.tax || 0), 0);

    const marketingCoast = Math.round(grossIncome * (30 / 100));

    const netMargin =
      grossIncome - discount - productCount - burnt - marketingCoast;

    const revenueDistribution = {
      netMargin,
      discount,
      productionCost,
      burnt,
      marketingCoast,
    };

    const adminCustomer = {
      admin: adminCount,
      customer: customerCount,
    };

    const userAgeGroup = {
      teen: allusers.filter((i) => i.age <= 20).length,
      adult: allusers.filter((i) => i.age <= 40 && i.age > 20).length,
      old: allusers.filter((i) => i.age > 40).length,
    };

    charts = {
      orderFullfillment,
      productCategories: categoryCount, // in percentage
      stockAvailablity,
      revenueDistribution,
      adminCustomer,
      userAgeGroup,
    };
    myCache.set("admin-pie-charts", JSON.stringify(charts));
  }

  return res.status(200).json({
    success: true,
    charts,
  });
});

export const getBarCharts = TryCatch(async (req, res, next) => {
  let charts;
  const key = "admin-bar-charts";
  if (myCache.has(key)) {
    charts = JSON.parse(myCache.get(key) as string);
  } else {
    const today = new Date();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const sixMonthProductPromise = Product.find({
      createdAt: {
        $gte: sixMonthsAgo,
        $lte: today,
      },
    }).select("createdAt");

    const sixMonthUsersPromise = User.find({
      createdAt: {
        $gte: sixMonthsAgo,
        $lte: today,
      },
    }).select("createdAt");

    const twelveMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: twelveMonthsAgo,
        $lte: today,
      },
    }).select("createdAt");

    const [products, users, orders] = await Promise.all([
      sixMonthProductPromise,
      sixMonthUsersPromise,
      twelveMonthOrdersPromise,
    ]);

    const productCounts = getChartData({ length: 6, today, docArr: products });
    const usersCounts = getChartData({ length: 6, today, docArr: users });
    const ordersCounts = getChartData({ length: 12, today, docArr: orders });

    charts = {
      users: usersCounts,
      products: productCounts,
      orders: ordersCounts,
    };

    myCache.set(key, JSON.stringify(charts));
  }

  return res.status(200).json({
    success: true,
    charts,
  });
});

export const getLineCharts = TryCatch(async (req, res, next) => {
  let charts;
  const key = "admin-line-charts";

  if (myCache.has(key)) {
    charts = JSON.parse(myCache.get(key) as string);
  } else {
    const today = new Date();

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const baseQuery = {
      createdAt: {
        $gte: twelveMonthsAgo,
        $lte: today,
      },
    };

    const [products, users, orders] = await Promise.all([
      Product.find(baseQuery).select("createdAt"),
      User.find(baseQuery).select("createdAt"),
      Order.find(baseQuery).select(["createdAt", "discount", "total"]),
    ]);

    const productCounts = getChartData({ length: 12, today, docArr: products });
    const usersCounts = getChartData({ length: 12, today, docArr: users });
    const discount = getChartData({
      length: 12,
      today,
      docArr: orders,
      property: "discount",
    });
    const revenue = getChartData({
      length: 12,
      today,
      docArr: orders,
      property: "total",
    });

    charts = {
        users: usersCounts,
        products: productCounts,
        discount,
        revenue
    };
    myCache.set(key, JSON.stringify(charts));
  }

  return res.status(200).json({
    success: true,
     charts
  });
});
