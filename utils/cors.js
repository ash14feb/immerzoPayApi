function addCorsHeaders(res, origin = "*") {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
}

function handleCorsPreflight(req, res) {
    addCorsHeaders(res, req.headers.origin || "*");
    if (req.method === "OPTIONS") {
        res.status(200).end();
        return true;
    }
    return false;
}

module.exports = {
    addCorsHeaders,
    handleCorsPreflight
};