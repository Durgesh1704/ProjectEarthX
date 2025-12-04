"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MintStatus = exports.VerificationStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["CITIZEN"] = "citizen";
    UserRole["COLLECTOR"] = "collector";
    UserRole["RECYCLER"] = "recycler";
})(UserRole || (exports.UserRole = UserRole = {}));
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["PENDING"] = "pending";
    VerificationStatus["VERIFIED"] = "verified";
    VerificationStatus["REJECTED"] = "rejected";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var MintStatus;
(function (MintStatus) {
    MintStatus["PENDING_MINT"] = "PENDING_MINT";
    MintStatus["MINTED"] = "MINTED";
    MintStatus["FAILED_ON_CHAIN"] = "FAILED_ON_CHAIN";
    MintStatus["RETRYING"] = "RETRYING";
})(MintStatus || (exports.MintStatus = MintStatus = {}));
//# sourceMappingURL=types.js.map