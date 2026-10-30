/* The user-supplied Bitly QR, decoded and regenerated with the same URL.
 * No Bitly watermark or opaque outer image. A pale scan-safe quiet zone is
 * retained so standard phone camera scanners can recognise it.
 * Encoded destination: https://bit.ly/4A3VRzz?r=qr
 */
export const TICKET_QR_TARGET='https://bit.ly/4A3VRzz?r=qr';
const QR_ROWS=[
'00000000000','00000000000','00000000000','00000000000',
'01fca9357f0','0105bfac410','017512795d0','01758ada5d0',
'0175cfba5d0','0105e2ea410','01fd55557f0','00007aa3000',
'004f2764be0','00e8dad7e10','01bf034e310','01788357690',
'01bd9f7d570','007bd37e410','00e74ac2990','008ac694430',
'01a5bb244e0','014a2c92e70','00b7c28a2d0','00d285c24a0',
'0175b34a230','00d1a6f8070','01dc15baf70','0069def42a0',
'01cfc403f30','0001e21f190','01fdba61590','0105d1491b0',
'017455cbf40','0174e479be0','017564921b0','01048087cc0',
'01fcd881dd0','00000000000','00000000000','00000000000','00000000000'
];
export function qrSvgMarkup(){
 let path='';
 for(let y=0;y<41;y++){
  const value=BigInt('0x'+QR_ROWS[y]);
  for(let x=0;x<41;x++)if((value>>BigInt(40-x))&1n)path+='M'+x+' '+y+'h1v1h-1z';
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 41 41" role="img" aria-label="Ticket QR code">'+
  '<rect width="41" height="41" fill="#ffeaf6"/>'+
  '<path fill="#171020" d="'+path+'"/></svg>';
}
export function mountTicketQR(host){
 if(!host)return;
 host.innerHTML=qrSvgMarkup();
}
