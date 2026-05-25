function cxCheckDigit(code){
  var digits=code.replace(/\D/g,'');
  if(digits.length!==6)return-1;
  var w=[7,3,1,7,3,1];
  var sum=0;
  for(var i=0;i<6;i++)sum+=parseInt(digits[i])*w[i];
  return sum%10;
}

function cxValidate(input){
  var clean=input.toUpperCase().replace(/\s/g,'');
  // CX260001-3 or CX2600013
  var m=clean.match(/^CX(\d{6})-?(\d)$/);
  if(!m)return null;
  var base=m[1], given=parseInt(m[2]);
  var expected=cxCheckDigit(base);
  if(given!==expected)return null;
  return "CX"+base+"-"+given;
}

var SHIPMENTS={
"CX260001-3":{
  origin:"Istanbul, Turkey",
  destination:"Nove Mesto Nad Vahom, Slovakia",
  mode:"Road Freight",
  cargo:"2 Pallets — 1,573 kg — PVC",
  shipper:"FABAMED KOZMETIK",
  consignee:"AURONIS S.R.O",
  events:[
    {status:"Booking Confirmed",date:"2026-05-12",location:"Istanbul",done:true},
    {status:"Cargo Collected",date:"2026-05-13",location:"Istanbul",done:true},
    {status:"At Warehouse",date:"2026-05-14",location:"Buyukcekmece Depo, Istanbul",done:true},
    {status:"Customs Clearance",date:"2026-05-16",location:"Istanbul",done:true},
    {status:"Departed",date:"2026-05-16",location:"Istanbul",done:true},
    {status:"In Transit",date:"2026-05-18",location:"Hamzabeyli Border, Turkey",done:true},
    {status:"In Transit",date:"2026-05-19",location:"Ivanovo, Bulgaria",done:true},
    {status:"In Transit",date:"2026-05-19",location:"Corbii Mari, Romania",done:true},
    {status:"In Transit",date:"2026-05-20",location:"Arad, Romania",done:true},
    {status:"In Transit",date:"2026-05-21",location:"Trnava, Slovakia",done:true},
    {status:"At Destination",date:"2026-05-21",location:"Nove Mesto Nad Vahom",done:true},
    {status:"Customs Cleared",date:"2026-05-22",location:"Nove Mesto Nad Vahom, Slovakia",done:true},
    {status:"Delivered",date:null,location:"Nove Mesto Nad Vahom, Slovakia",done:false}
  ]
},
"CX260002-4":{
  origin:"Istanbul, Turkey",
  destination:"Nove Mesto Nad Vahom, Slovakia",
  mode:"Road Freight",
  cargo:"4 Pallets — 2,084 kg — MCC 102 (Accent)",
  shipper:"MKT KIMYEVI MADDELER VE GIDA SAN. TIC. A.S.",
  consignee:"ECOPRODUCT ENERGY S.R.O.",
  events:[
    {status:"Booking Confirmed",date:"2026-05-15",location:"Istanbul",done:true},
    {status:"Cargo Collected",date:"2026-05-18",location:"Ikitelli, Istanbul",done:true},
    {status:"At Warehouse",date:"2026-05-18",location:"Buyukcekmece Depo, Istanbul",done:true},
    {status:"Customs Clearance",date:"2026-05-22",location:"Istanbul",done:true},
    {status:"Departed",date:"2026-05-22",location:"Istanbul",done:true},
    {status:"In Transit",date:"2026-05-23",location:"Hamzabeyli Border, Turkey",done:true},
    {status:"In Transit",date:"2026-05-25",location:"Elhovo, Bulgaria",done:true},
    {status:"At Destination",date:null,location:"Nove Mesto Nad Vahom",done:false},
    {status:"Delivered",date:null,location:"Nove Mesto Nad Vahom, Slovakia",done:false}
  ]
}
};
