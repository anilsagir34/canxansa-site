// CANXANSA shipment tracking data — ENCRYPTED at rest.
// Each record is AES-256-GCM encrypted with a key derived (PBKDF2-SHA256) from
// its own tracking code. Without the exact code, the payload is unreadable, so
// fetching this file no longer discloses customer data. Decryption happens in
// the browser only after the visitor enters a valid code (see track/index.html).
// NOTE: customer codes are 11 digits (10 random + check), so the offline
// brute-force space is ~10^10 instead of the old 6-digit ~10^5.
// Real confidentiality requires a backend (see research/tracking_system_plan.md).

// [7,3,1] tekrarli agirlik. Tek hane hatasini ve komsu hane yer degistirmesini yakalar.
function cxCheckDigit(digits){
  var w=[7,3,1],sum=0;
  for(var i=0;i<digits.length;i++)sum+=parseInt(digits[i])*w[i%3];
  return sum%10;
}

// Iki bicim kabul edilir:
//   1) 11 haneli musteri takip kodu (2026-08 sonrasi) — 10 hane + check digit.
//      Bosluklu girilebilir: "7720 9975 165"
//   2) CX + 6 hane + check digit — Mayis 2026'daki ilk iki sevkiyat.
//      Musteriye o numarayla gitti ve feedback linklerinde duruyor, geriye donuk korunuyor.
function cxValidate(input){
  var clean=input.toUpperCase().replace(/[\s-]/g,'');

  if(/^\d{11}$/.test(clean)){
    if(cxCheckDigit(clean.slice(0,10))!==parseInt(clean[10]))return null;
    return clean;
  }

  var m=clean.match(/^CX(\d{6})(\d)$/);
  if(m&&cxCheckDigit(m[1])===parseInt(m[2]))return "CX"+m[1]+"-"+m[2];

  return null;
}

var CX_SALT_HEX="7df9738e2034f07f13023d7e35bd6cca";
var CX_ITER=200000;
var CX_RECORDS=[{"iv": "Qzm1UUg+m7WrFpMg", "ct": "6z44tbDbzLrZYeW4avGHus0agMcmZLCW6ElL4bJNtDFT4CLyeiByRzR8l2KTu/HPI8Z9wAtXp62uAfvHXv2Nb3inaG0LlqmUxD0d5s2hXKgyoV+zKvcQHMLqpvuvWbgK/3GA99yELtYTTCECGmr9YXXWU43b2CmTEr7uer82qsZCDQL/NKs/OxcUJsKwEUm5UKGC5KGliXSVLYHGpTe4ntpR5Dc+JjhTMMFlYb3/tlFdUKp5NteSnbp5PVUYOLwHTPZJR7nTWFOQOSSM6mBO5HpJyw5bpnUcCwkNyq3BP1iswZeFPXMf4yclyMFx+mmh0+gv3IiLD1LvtWSLPYfu5Y0M09KPIeOnfzVpHXp7fkoPGRdfHLnCPb8+bS0ry37QRkNFrl2URlGwHS7N8UNukiadnbcqHkPRgY3kmNGc6/gtIPTUGcd5WuivKm1OV07muKGEaomYoae5BdWl5cblx1ywGyxm8+xKYTy2ft6mecRmFnqyJIt7hSXoekmgObDcoKkfHxl5BG5RZkpjbOuxiQ1op+EdEOteBRUNm2Ked7GprmIQcGGcgZwLC3m6JmLxjWa/UjVS3335hpzKad40xQ8MNnuvnwvCw1s2f23UVrn4VbpLMu0AHyDk8BhGA+3wv3GJNKApU0tbtAnnMJC8zK/CLOZmJuu0BV1ARCeNkDk5dQ7oQiCP0yO/KVn4Qq43Qf7DHNRgOHhucw6s7oEE6oOPDrqrT9pRQ8W8vR4ti8Br6k2yh6RdtXmzizvuEy2641Tlp42g2udrQ9vbkbYULp/TSTu5AHe3ZDgq4nU/2GJxddjkCrHeiULWXmPkeqyBt8o1ZIhE5k6RVabFSf1Dp36DXNXiv3w7xP4Z89XBnR5nnTQ5uMpCNwPVLH9axPPP89Nl45ZJshPazG2/Ky8oeE7gbIN1PAVYc0lO+Y/R5WXjIek7s0n4I3npfczZ+5rDcymWMc7rl5JLfPoHfSLJtmi27CVRKZRBbCFmbYdBli1wmUpnfan992AdLffCT3Q+M3xfvOauwUxZKuFT0JefQu7hAFBKp19qMOWBfMUYVFfzAvo0cb9glUTnVzoUwpTS7aGhhmIswUVz9hJUdLX8n/x9IUIpqcLK6Cu057+h+qCvxXfts790RgqGzfZWs2P0kCWxMNqrakwKiFFJxdZKDx6h8RZ4WTRbK0CvjfMCS/BFM/Ygo459lsa2UjEuUuz1S1zrziVu9lZfGY7MKhSf3yN4n13hi1VkPIF1gX8pC5KqcnhVq5c2NxuJt8izyao7YkSPI/LOjIBm1NFguviR+BHzJR8DBZSQHmBMXrj6jWKkX2rj0r2hMEsoAfb3Odc0KC9NoF10tjLEKoaoS4EDynSUCuwA5x9lyx8JhL3y96+gniXzkRC6Dr8mNeH8q2FNrEkw5YYH3XlwTwNEJl1U+XxkTiNjoiBL3mpp1gq1g8opn9n8QWOMJSPmHtC4kGd7pQVtIJz5CtpHM4HYNS4kqKZKicXrsT7OOt//mFv2UB458U6Q4AOr8DeKSaMPP7cWm82Dfu5qvUoRNc5gGW5RuXZYrQeGh1CDGmMlX2hk9VOKMs6DaMrXjRv7vpe6FzhPvPSqDW1zsmr6LsCKc84PAg3rLLi/EigkFcMbu+ssiJIyxnkeugLLx2PQWBO+VLnu3XQu22T8jNfa5YoUb2U0RWLaqeGaEhNvCNZWenE0zXtKeCM61vleMsf06cOCQX9CZKDFZDjOG0Y043BwrKKzz7sqw1E1Of9ZyYGsktW5D5rS7Wwsa0i64z+dq5Rff4Pe/YXP8c85nyAZT/muMMO0XvlnABf2+93npUjE82AWbtBt1cU="}, {"iv": "LYPbFWZoipmh2+vF", "ct": "4p8t/jetBIPHjUZRcgZZZFaYq6Xqf54nGWiGi7prVHxmrBUHWIuDPUiaf1fFu+BddCR2dUqSJ+bpBRpgZ6dPGA37Pw6agxGBzthA2lQeRzCADbb3tvlUyOF/HsDY09CZ+kylyDuBD4U0jjupNMoB3J/Rvd1G8+einzJr9Sb+i3XDEEG/9mNIErunYGYrQyinus2YOZUklXYIfYiJT0Bfsj0ljI73T9oiq9cI1fwJ4TuAxf+jAmh9EIKnlq0aam7rWoq5n7KwOgUGSH5bKDQcfQBlkRvHdJi5eyjDv8ljK0FIMq1RfjMYvY9Wvc66HqxPvW8OIAyr18zpeGzC8XOWUUZiFAyPPc3NMkhZxItqTrpJZ8J78OuiXHacsB3MFOp0p/Cfhfg3gHYYUbIXfwvQ1aejtRv9F6348ZcaxiCdE2E9YPc1Xa5C0YvyAWcXRiADd/6Qk5Ill5btBxFmUchgNnyU0RzxLENhB0/oS6YsdqM6ezvitHk5OrWc58JlaUB8dKeMo1hNyT7hOyHhkOXvFtpnVD7zTEdxwQ3PKgemkWlS4fZkKvGKd1+yNbOqvg0zuoEuyypCV+sqKZbQ4+RUHMb+vLWfjonfdNdx4bKFqETrfg2KxL1Wr93Io5loZEMv9Ot2cEHx3X68EgN4NXsMnGd+IzWhQ4bE7ckq76I0WOSdvORD2QS1pQuetDRSQIsNp+Ec6XTxT0+3bqdMSkASwnFCYMilWJ+LLTmqyisv0K9x+zNyhThqGjDR8S3Kswyq4yni9T260TdBfNgyLbL/kWSN9TuBp1fHIhZF0VLuD0AcBAxn4Ae7OyTRTp8mgYuCI1El+wsxFP+nv+KJS104BuEBqhRnvmG7f8fiFHMyiMky3RFvg+53rQo3rzhHqWGpow6jPjj26WlycJgKfroKcV0l43mgS4LrGk6IAP9+fLGifn/I3Zgv6DtxvLAWqx0sAQO22oc/BdjiG+W/izFOuzgYOXpF8BH/MLWriz2CfFA8gRkrKU9h4WnlgdnUcvYmP5QdETtfKizQ9I2T9ytLziA/kKaBGTVfPCDfK7V7zwa5rmMnKCDwRFjDzX+eKBuQzM8qAHz1RXTUYPqgyw54Kr2RWg4BO6dtd9CL0XWR+Els1VL0r/vW4Hg4Q2lKspyPZ7epAWO2+VgyvaWPNt0bp9R1DonfRZviPSf1akUfji7JhrAwuUWskZv5J5XLYXQlcMCjl4B564f4SohCPDqPR4YDo2LYmFj8/JymDFkmzJnK7iXwMHijG8YgT3REqH8zxvujVqS9OYuP9RCjNoykiZD5Z35TpF2r7I2NFDreziAcMvQAer28v5cMhILT/4ErwItm6OfHAAIjfzMdSsw+LBrJwIRr59zFs21R6nUfZKTYCoH08VgHLsXkVqJCKWKYtuOPwCx+5kHqNOQDGtCB+5usShwgxrlqjCkowE9IsFUlWQvu6yegFJl18+enth4/Wq0pHsDV6luMpX8bLmtSDwSC5nDt5MAZ4tuJkgYKV4v4sKFrgSYQWh7+8jf544GS6RbjCLtrJh0GvJxTQJCGLzCUsKhq5B/m0sefSpfW1ObYQSP0P1fXgZG4qVAh2qOeRjVMKdcy5Ffu4/2yj5eSC9TgE5D2adVsHSICgkyjADfvI4+BKE9r5Wkqxe3XM2OPJEI0WlWSx7YKdD5kTWMgRAmUhtDMhPPZ9hf8i1TRT9FqSGb6SxtBLe4Kn0c7aPczr63IytZAgz54YWcCOYBnB2XNSAOAwsfwqg6no1mfl025Hu1RhJBMsEkzDOe4xaMPMaZ8unIr4NYD2TsW6nBn4J5DdLcyrwbf6Lsao9iX+TbE0LeAgmLJbTe7/04xwSaxwRC+Yfn+A7p2"}, {"iv": "ICdqdD0fx8kF5N4z", "ct": "WC32DuzU3lhIQF3PO8RuoTTo3OddYzB2PWMqOUxl27cupp1NeC8yve9X4z6HAuALXn53cf/YrVo1wOLJrZSkJo86fGel3jrgAw2RR5NNs8Imrb9q/PMXVP/gUfhhi6sIGxmDydTVfNHVdIpd8O3oPMYaJsg30/e6n+ewH33BU6oZXHFrKHpZPdpHgHpu+Dm88lO3Ja05RVR7VjcOSZH/RKRfEOYMzM8/JYzJrfau1BnlMbTVZzQO6osyyZ+/DnhJrD14pkbxIq3l8fQPCnN6FzW0p03JKVYp/joQva5xZWmb9VL5/YuTQTgs0UFQUWiMEn0Vxm+JqDlcPYZEV/2KHVk0CI0fwnGRoIgoNn5nTFnLcN0we6jV8GwHonNV5r/43po1wAtkkVCRVytWukYW9IvQ/Mh9YZOcPXxOrS0OTEsLpcm764hDADRJ+KceBxrhm9QT+z2DoQQJgyYW8CAaBk8i5gGU0MokWWn3dFs7GugScCXrkJ9GK3JqpLagHs5htAoGIBa3H2iUwluPoTSdl94kU0ogPoX9xbTIkLYzJfetdXkuc3j84yPs6of14SnbNSLTGL/oqd0ku9dksCNbUkyvgYeI9ZHiTF9655EUd4y8CInsd7X9ISVU0iu1xsksC1Agq6DJHWycUcDgdOogex9yqUeMTGqK74cfZPL7P0669MhT+2oe7wKlz2PSXJtvEMS0GHKt+BzuHwyGpvLl9UX5rzFIKnlwoszDY7wTv30cusW45Q5/ZnTvdV4cShyPSCiaUWzbmb5Kg8oPGjLfOcTp7T/1IhLaXznN6asmvfG4bfZGDUBxd4V4wpiJjvImtpOPA3zIUK5+jwH3WLN8r0/0fJP3pUdNGOmXdMRvpMVY59uqDa1ocgKUpzmqYEtOgz5yhbKKqzN48EiWEWdtp0h3ulJrSFKVkOXbTB8XnYg475QHBo+/hJmmxWCB7QW7bSASe1rlTCJ6zjcx2u9GPxL80UJJX4mglReSI5lrhBqHwln+k54GalmbR9R4EvXDfqcDsXlMkty9UoXLaECwpp/MkU/QfHpZq4VSiOoSqZsj3gI5AY3w1yh51lWGuvDdaCwcnrLOIuZc1jy1zKqVhCjoo9qmurmCUO/eRAdFGpKnjG24LPQpfa1L9O9NFqUfCfXoHKmTkM6SvYZzLzZYC3835jfujvFzgN3iCTlN2A5v4WwZzddie1eOBX7wq1oFu/vnIq5ABn+WeYTTN/WvHhLsn8HeqxjmXPpiVVEEjt0tv2os+PR2uCwfcPfaCY7QPci36BT4cGIcA6AlgyfcTuHoG2aaxeFApp1cB2yZ6LLBy0S9dCFDiCX+/etGnyCw7dOcpJBlvzah02fMULGjermc1XE5xKLC7B6N1ZpFkBpcE6lYsq2o"}];

function _cxHexToBytes(h){var a=new Uint8Array(h.length/2);for(var i=0;i<a.length;i++)a[i]=parseInt(h.substr(i*2,2),16);return a;}
function _cxB64ToBytes(b){var s=atob(b),a=new Uint8Array(s.length);for(var i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a;}

// Returns a Promise resolving to the shipment record for a validated code,
// or null if no record matches (wrong/unknown code).
function cxLookup(id){
  if(!(window.crypto&&window.crypto.subtle))return Promise.reject(new Error('crypto unavailable'));
  var enc=new TextEncoder();
  return window.crypto.subtle.importKey('raw',enc.encode(id),'PBKDF2',false,['deriveKey']).then(function(km){
    return window.crypto.subtle.deriveKey({name:'PBKDF2',salt:_cxHexToBytes(CX_SALT_HEX),iterations:CX_ITER,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
  }).then(function(key){
    var i=0;
    function tryNext(){
      if(i>=CX_RECORDS.length)return Promise.resolve(null);
      var r=CX_RECORDS[i++];
      return window.crypto.subtle.decrypt({name:'AES-GCM',iv:_cxB64ToBytes(r.iv)},key,_cxB64ToBytes(r.ct))
        .then(function(pt){return JSON.parse(new TextDecoder().decode(pt));})
        .catch(function(){return tryNext();});
    }
    return tryNext();
  });
}
