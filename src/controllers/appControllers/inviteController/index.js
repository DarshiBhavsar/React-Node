const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

function inviteController() {
    const Model = mongoose.model('Invite');
    const methods = createCRUDController('Invite');

    return methods;
}

module.exports = inviteController(); 
