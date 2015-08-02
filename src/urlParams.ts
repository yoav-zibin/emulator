// Parameters passed via the URL (in location.search).
interface UrlParams {
  // Specific language you want to load
  lang?: string;
}

function createUrlParams(): UrlParams {
  var query = location.search.substr(1);
  var result:UrlParams = {};
  query.split("&").forEach(function(part) {
    var item = part.split("=");
    result[item[0]] = decodeURIComponent(item[1]);
  });
  return result;
}

var urlParams = createUrlParams();
