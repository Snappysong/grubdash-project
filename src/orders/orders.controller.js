const { ESRCH } = require("constants");
const { STATUS_CODES } = require("http");
const path = require("path");
const orders = require(path.resolve("src/data/orders-data"));
const nextId = require("../utils/nextId");

//middleware 
function orderExists(req, res, next){
    const {orderId} = req.params;
    const foundOrder = orders.find((order) => order.id === orderId);
    if(foundOrder){
        res.locals.order = foundOrder;
        return next();
    }
    next({
        status: 404,
        message: `Order does not exist: ${orderId}.`
    });
}

function orderHasDeliverTo(req, res, next){
    const {data: {deliverTo} = {} } = req.body;
    if(!deliverTo || deliverTo === ""){
        next({
            status: 400,
            message: 'A deliverTo is required.'
        });
    }
    return next();
}

function orderHasMobileNumber(req, res, next){
    const {data: {mobileNumber} ={}} = req.body;
    if(!mobileNumber || mobileNumber === ""){
        next({
            status: 400, 
            message: 'A mobileNumber is required.'
        });
    }
    return next();
}

function orderHasStatus(req, res, next){
    const {data: {status} = {}} = req.body;
    if(!status){
        next({
            status: 400,
            message: 'Order status is required.'
        });
    }
    return next();
}

function orderHasValidStatus(req, res, next){
    const {data: {status} = {}} = req.body;
    if(status === "pending" || status === "preparing" || status === "out-for-delivery" || status === "delivered"){
        return next();
    }
    next({
        status: 400, 
        message: 'Order must have a valid status.'
    });
}

function orderHasDishes(req, res, next){
    const {data: {dishes} = {}} = req.body;
    if(!dishes || dishes.length <= 0){
        next({
            status: 400,
            message: 'Order must include at least one dish.'
        });
    }
    return next();
}

function dishesArrayIsArray(req, res, next){
    const {data: {dishes} = {}} = req.body;
    if(Array.isArray(dishes)){
        return next();
    }
    next({
        status: 400, 
        message: 'dishes needs to be an array.'
    });
}

function orderHasQuantity(req, res, next){
    const {data: { dishes } = {}} = req.body;
    const missingQuantity = dishes.find((dish) => !dish.quantity);
    if(missingQuantity){
        const index = dishes.indexOf(missingQuantity);
        next({
            status: 400,
            message: `Dish ${index} must have a quantity that is an integer greater than 0.`
        });
    }
    return next();
}

function orderQuantityIsInteger(req, res, next){
    const {data: {dishes} = {}} = req.body;
    const notAInteger = dishes.find((dish) => !Number.isInteger(dish.quantity));
    if(notAInteger){
        const index = dishes.indexOf(notAInteger);
        next({
            status: 400,
            message: `Dish ${index} must have a quantity that is an integer greater than 0.`
        });
    }
    return next();
}

function checkStatusForPending(req, res, next){
    const order = res.locals.order;
    const {status} = order;
    if(status !== "pending"){
        next({
            status: 400,
            message: 'Order is pending and cannot be deleted.'
        });
    }
    return next();
}

function orderIdMatches(req, res, next){
    const {orderId} = req.params;
    const {data: {id} = {}} = req.body;
    if(orderId === id || !id){
        return next();
    }
    next({
        status: 400,
        message: `Order id does not match route id. Order: ${id}, Route: ${orderId}.`
    });
}

//http methods
function list(req, res){
    res.json({data: orders});
}

function create(req, res){
    const { data: {deliverTo, mobileNumber, status, dishes} = {} } = req.body;
    const newId = new nextId();
    const newOrder = {
        id: newId,
        deliverTo: deliverTo,
        mobileNumber: mobileNumber,
        status: status,
        dishes: dishes,
    }
    orders.push(newOrder);
    res.status(201).json({data: newOrder});
}

function read(req, res){
    res.json({data: res.locals.order});   
}

function update(req, res){
    const order = res.locals.order;
    const originalDeliverTo = order.deliverTo;
    const originalMobileNumber = order.mobileNumber;
    const originalStatus = order.status;
    const originalDishes = order.dishes;
    const originalQuantity = order.dishes.quantity;
    const { data: {deliverTo, mobileNumber, status, dishes} = {} } = req.body;
    const { data: { dishes: {quantity} = {} }} = req.body;
    if(originalDeliverTo !== deliverTo){
        order.deliverTo = deliverTo;
    }
    if(originalMobileNumber !== mobileNumber){
        order.mobileNumber = mobileNumber;
    }
    if(originalStatus !== status){
        order.status = status;
    }
    if(originalDishes !== dishes){
        order.dishes = dishes;
    }
    if(originalQuantity !== quantity){
        order.dishes.quantity = quantity;
    }
    res.json({data: order});
}

function destroy(req, res){
    const {orderId} = req.params;
    const index = orders.findIndex((order) => Number(order.id) === Number(orderId));
    const deletedOrders = orders.splice(index, 1);
    res.sendStatus(204);
}

module.exports = {
    list,
    read: [orderExists, read],
    create: [
        orderHasDeliverTo, 
        orderHasMobileNumber, 
        orderHasDishes,
        dishesArrayIsArray, 
        orderHasQuantity, 
        orderQuantityIsInteger,
        create
    ],
    update: [
        orderExists, 
        orderHasDeliverTo, 
        orderHasMobileNumber, 
        orderHasStatus, 
        orderHasValidStatus,
        orderHasDishes, 
        dishesArrayIsArray,
        orderHasQuantity, 
        orderQuantityIsInteger,
        orderIdMatches,
        update
    ],
    delete: [orderExists, checkStatusForPending, destroy]
}