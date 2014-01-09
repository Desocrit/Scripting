var menu;
var currentElement;
var e;
var getOffset = window.parent.getOffset;

window.oncontextmenu = (function(_e)
{
    var el = _e.toElement || _e.target;
    if (el.isAnnotation) return true;

    menu.style.display = 'block';
    menu.style.left    = _e.layerX + 'px';
    menu.style.top     = _e.layerY + 'px';
    currentElement     = el.id;
    e                  = _e;

    return false;
});

var makeAnnotation = (function(x, y, el, text, uniqid)
{
    var annotationWrap = document.createElement('div');

    annotationWrap.className = 'annotation_wrap';
  
    annotationWrap.isAnnotation   = true;
    annotationWrap.subjectElement = document.getElementById(el);
    annotationWrap.uniqid         = uniqid;
    annotationWrap.relativeCoords = { "x" : x, "y" : y };
    annotationWrap.style.top      = getOffset(annotationWrap.subjectElement, 'Top')  + y + 'px';
    annotationWrap.style.left     = getOffset(annotationWrap.subjectElement, 'Left') + x + 'px';
    annotationWrap.resize         = (function()
    {
        this.style.left      =
              this.relativeCoords.x
            + getOffset(this.subjectElement, 'Left')
            + 'px';
        this.style.top      =
              this.relativeCoords.y
            + getOffset(this.subjectElement, 'Top')
            + 'px';
    });

    var annotationContent = document.createElement('textarea');
    annotationContent.className = 'annotation_text';
    annotationContent.value           = text;
    annotationContent.placeholder     = 'Type Here...';
    annotationContent.contentEditable = true;
    annotationContent.isAnnotation    = true;
    annotationContent.onfocus         = (function() { this.wrapper.inEdit = true; });
    annotationContent.onblur          = window.parent.saveAnnotation;
    annotationContent.wrapper         = annotationWrap;
    annotationWrap.contentEl          = annotationContent;


    var closeDiv = document.createElement('div');
    closeDiv.className = 'close';
    closeDiv.uniqid = annotationWrap.uniqid;
    var closeX = document.createElement('span');
    closeX.className = 'closeX';
    closeX.innerHTML = 'x';
    closeX.uniqid    = uniqid;
    closeX.wrapper   = annotationWrap;
    closeX.onclick   = (function()
    {
        window.parent.jsonCall
        (
            'delete annotation', 'uniqid=' + this.uniqid,
            (function(){}), (function(){})
        );
        delete window.parent.annotations[this.uniqid];
        document.body.removeChild(this.wrapper);
    });

    menu.style.display = 'none';
    document.body.appendChild(annotationWrap);
    annotationWrap.appendChild(annotationContent);
    annotationWrap.appendChild(closeDiv);
    closeDiv.appendChild(closeX);

    window.parent.annotations[annotationWrap.uniqid] = annotationWrap;
    
    $(".annotation_wrap").draggable
    ({
        stop: window.parent.saveAnnotation,
        start: (function() { this.inEdit = true; })
    })
    /*
    .click(function() {
        $(this).draggable( {disabled: true});
    }).dblclick(function() {
        $(this).draggable({ disabled: false });
    })
    */
    .resizable();
    $(".annotation_wrap").on("mouseout", function() {
        $(this).draggable( {disabled: false});
    })
});

var addAnnotation = (function()
{
    var el = document.getElementById(currentElement);

    makeAnnotation
    (
        e.layerX - getOffset(el, 'Left'),
        e.layerY - getOffset(el, 'Top'),
        currentElement,
        "",
        generateUid()
    );
});

$(document).ready(function()
{
    menu = document.createElement('div');
    menu.style.display  = 'none';
    menu.style.width    = '300px';
    menu.style.position = 'absolute';

        var a       = document.createElement('a');
        a.onclick   = addAnnotation;
        a.innerHTML = 'Add Annotation';
        a.className = 'context_menu';
        menu.appendChild(a);

    document.body.appendChild(menu);

    window.parent.annotations = { };
    window.parent.setCallback(makeAnnotation);
});

var generateUid = function (separator)
{
    var delim = '';//separator || "-";

    function S4()
    {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }

    return (S4() + S4() + delim + S4() + delim + S4() + delim + S4() + delim + S4() + S4() + S4());
};

window.onresize = (function()
{
    for (var i in window.parent.annotations)
    {
        window.parent.annotations[i].resize();
    }
});